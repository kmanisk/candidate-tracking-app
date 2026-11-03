import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import cookie from 'cookie';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const isProduction = () => process.env.NODE_ENV === 'production';
const cookieName = () => isProduction() ? '__Host-hireline_session' : 'hireline_session';
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'strict',
  path: '/',
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, lowercase: true, trim: true, unique: true },
  displayName: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  ownerKey: { type: String, required: true, unique: true, default: 'primary' },
}, { timestamps: true, versionKey: false });

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'HirelineUser', required: true },
  csrfToken: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

export const User = mongoose.models.HirelineUser || mongoose.model('HirelineUser', userSchema);
export const Session = mongoose.models.HirelineSession || mongoose.model('HirelineSession', sessionSchema);

const hashOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const credentials = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/).transform(v => v.toLowerCase()),
  password: z.string().min(1).max(256),
}).strict();
const setupSchema = credentials.extend({
  displayName: z.string().trim().min(2).max(80),
  setupToken: z.string().min(20).max(256),
}).refine(v => v.password.length >= 12, {
  message: 'Use at least 12 characters for your password',
  path: ['password'],
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
}).strict();

const digest = value => createHash('sha256').update(value).digest('hex');
const safeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const publicUser = user => ({
  id: String(user._id),
  username: user.username,
  displayName: user.displayName,
});

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const validate = (schema, req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return null;
  }
  return parsed.data;
};

// State-changing requests from other origins are rejected, including setup and login.
function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const site = req.get('sec-fetch-site');
  const expected = req.protocol + '://' + req.get('host');
  if (site === 'cross-site' || (origin && origin !== expected)) {
    return res.status(403).json({ error: 'Cross-origin requests are not permitted.' });
  }
  next();
}

async function readSession(req) {
  const raw = cookie.parse(req.get('cookie') || '')[cookieName()];
  if (typeof raw !== 'string' || raw.length < 30 || raw.length > 150) return null;
  const session = await Session.findOne({ tokenHash: digest(raw), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  if (!user) return null;
  return { session, user };
}

async function createSession(res, user) {
  const secret = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  await Session.create({
    tokenHash: digest(secret),
    userId: user._id,
    csrfToken,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  res.cookie(cookieName(), secret, { ...cookieOptions(), maxAge: SESSION_MS });
  return { user: publicUser(user), csrfToken };
}

const invalidCredentials = res => res.status(401).json({ error: 'Invalid username or password.' });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Try again later.' },
});

export function configureAuth(app) {
  app.use('/api', sameOrigin);

  app.get('/api/auth/status', asyncRoute(async (req, res) => {
    const current = await readSession(req);
    if (current) return res.json({ authenticated: true, setupRequired: false, ...{
      user: publicUser(current.user), csrfToken: current.session.csrfToken,
    } });
    const exists = Boolean(await User.exists({ ownerKey: 'primary' }));
    res.set('Cache-Control', 'no-store');
    res.json({
      authenticated: false,
      setupRequired: !exists,
      setupAvailable: !exists && Boolean(process.env.HIRELINE_SETUP_TOKEN),
    });
  }));

  app.post('/api/auth/setup', loginLimiter, asyncRoute(async (req, res) => {
    const form = validate(setupSchema, req, res);
    if (!form) return;
    if (!process.env.HIRELINE_SETUP_TOKEN) return res.status(503).json({ error: 'Owner setup is not configured.' });
    if (!safeEqual(form.setupToken, process.env.HIRELINE_SETUP_TOKEN)) {
      return res.status(403).json({ error: 'Invalid workspace setup key.' });
    }
    if (await User.exists({ ownerKey: 'primary' })) {
      return res.status(409).json({ error: 'Workspace owner already exists. Please sign in.' });
    }
    const passwordHash = await argon2.hash(form.password, hashOptions);
    let user;
    try {
      user = await User.create({
        username: form.username,
        displayName: form.displayName,
        passwordHash,
        ownerKey: 'primary',
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Workspace owner already exists. Please sign in.' });
      }
      throw error;
    }
    res.status(201).json(await createSession(res, user));
  }));

  app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
    const form = validate(credentials, req, res);
    if (!form) return;
    const user = await User.findOne({ username: form.username }).select('+passwordHash');
    // Always perform an Argon2 verification to reduce observable username enumeration.
    const checkHash = user?.passwordHash || DUMMY_HASH;
    const valid = await argon2.verify(checkHash, form.password).catch(() => false);
    if (!valid || !user) return invalidCredentials(res);
    const oldToken = cookie.parse(req.get('cookie') || '')[cookieName()];
    if (oldToken) await Session.deleteOne({ tokenHash: digest(oldToken) });
    res.json(await createSession(res, user));
  }));

  async function authRequired(req, res, next) {
    try {
      const current = await readSession(req);
      if (!current) return res.status(401).json({ error: 'Please sign in to continue.' });
      req.auth = current;
      next();
    } catch (error) { next(error); }
  }

  function csrfRequired(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const token = req.get('x-hireline-csrf') || '';
    if (!token || !safeEqual(token, req.auth.session.csrfToken)) {
      return res.status(403).json({ error: 'Invalid or missing request token. Refresh and try again.' });
    }
    next();
  }

  app.use('/api', authRequired, csrfRequired);

  app.post('/api/auth/logout', asyncRoute(async (req, res) => {
    await Session.deleteOne({ _id: req.auth.session._id });
    res.clearCookie(cookieName(), cookieOptions());
    res.status(204).send();
  }));

  app.patch('/api/auth/password', loginLimiter, asyncRoute(async (req, res) => {
    const form = validate(passwordSchema, req, res);
    if (!form) return;
    const user = await User.findById(req.auth.user._id).select('+passwordHash');
    if (!user || !await argon2.verify(user.passwordHash, form.currentPassword)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (form.currentPassword === form.newPassword) {
      return res.status(400).json({ error: 'Choose a different new password.' });
    }
    user.passwordHash = await argon2.hash(form.newPassword, hashOptions);
    await user.save();
    await Session.deleteMany({ userId: user._id, _id: { $ne: req.auth.session._id } });
    res.json({ success: true });
  }));
}

// A fixed test hash only used to make nonexistent usernames take a comparable verification path.
const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$VwxwI/atH0Mq+qHjd1NcYw$keGcVhJzyi6n63dXxeOSHl6p9OCIXvPeWXxiFORJly8";
