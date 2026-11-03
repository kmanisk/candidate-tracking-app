import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Candidate, STAGES, toCandidate } from './model.js';
import { candidateInput, candidatePatch, stageInput, noteInput, pageInput, limitInput } from './validation.js';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  },
}));
app.use(express.json({ limit: '24kb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || false }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const invalid = (res, result) => res.status(400).json({ error: 'Validation failed', details: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
const isId = id => mongoose.isValidObjectId(id);

app.get('/api/health', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
  status: mongoose.connection.readyState === 1 ? 'ok' : 'database unavailable',
}));

// Report disconnected database immediately instead of waiting for Mongoose's query timeout.
app.use('/api', (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Check the MongoDB connection and retry.' });
  }
  next();
});

app.get('/api/interviews/upcoming', asyncRoute(async (_req, res) => {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400000);
  const docs = await Candidate.find({
    stage: 'Interview',
    interviewAt: { $gte: now, $lte: end },
  }).sort({ interviewAt: 1, _id: 1 }).limit(6).lean();
  res.json({ items: docs.map(toCandidate) });
}));

app.get('/api/stats', asyncRoute(async (_req, res) => {
  const [total, byStage, upcoming, latest, roles] = await Promise.all([
    Candidate.countDocuments(),
    Candidate.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]),
    Candidate.countDocuments({ interviewAt: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) }, stage: 'Interview' }),
    Candidate.find().sort({ updatedAt: -1 }).limit(5).lean(),
    Candidate.distinct('role'),
  ]);
  const counts = Object.fromEntries(STAGES.map(s => [s, 0]));
  for (const value of byStage) counts[value._id] = value.count;
  res.json({ total, byStage: counts, upcoming, latest: latest.map(toCandidate), roles: roles.sort() });
}));

app.get('/api/candidates', asyncRoute(async (req, res) => {
  const pageParsed = pageInput.safeParse(req.query.page);
  const limitParsed = limitInput.safeParse(req.query.limit);
  if (!pageParsed.success || !limitParsed.success) return res.status(400).json({ error: 'Invalid pagination' });
  const page = pageParsed.data;
  const limit = limitParsed.data;
  const filters = [];
  const search = String(req.query.search || '').trim().slice(0, 100);
  const stage = String(req.query.stage || '').trim();
  const role = String(req.query.role || '').trim().slice(0, 100);
  const skill = String(req.query.skill || '').trim().slice(0, 40);
  if (stage && !STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage filter' });
  const escapeRegex = value => value.split('').map(ch => '.+*?^$()[]{}|'.includes(ch) || ch.charCodeAt(0) === 92 ? String.fromCharCode(92) + ch : ch).join('');
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filters.push({ $or: [{ name: re }, { email: re }, { role: re }, { skills: re }] });
  }
  if (stage) filters.push({ stage });
  if (role) filters.push({ role });
  if (skill) filters.push({ skills: new RegExp(escapeRegex(skill), 'i') });
  const query = filters.length ? { $and: filters } : {};
  const [total, docs] = await Promise.all([
    Candidate.countDocuments(query),
    Candidate.find(query).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({ items: docs.map(toCandidate), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}));

app.get('/api/candidates/:id', asyncRoute(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(toCandidate(candidate));
}));

app.post('/api/candidates', asyncRoute(async (req, res) => {
  const parsed = candidateInput.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);
  const candidate = await Candidate.create({
    ...parsed.data,
    history: [{ to: parsed.data.stage, at: new Date() }],
  });
  res.status(201).json(toCandidate(candidate));
}));

app.patch('/api/candidates/:id', asyncRoute(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  const parsed = candidatePatch.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  if (parsed.data.stage && parsed.data.stage !== candidate.stage) {
    candidate.history.push({ from: candidate.stage, to: parsed.data.stage });
  }
  Object.assign(candidate, parsed.data);
  await candidate.save();
  res.json(toCandidate(candidate));
}));

app.patch('/api/candidates/:id/stage', asyncRoute(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  const parsed = stageInput.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  if (candidate.stage !== parsed.data.stage) {
    candidate.history.push({ from: candidate.stage, to: parsed.data.stage });
    candidate.stage = parsed.data.stage;
    await candidate.save();
  }
  res.json(toCandidate(candidate));
}));

app.post('/api/candidates/:id/notes', asyncRoute(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  const parsed = noteInput.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  candidate.notes.push({ text: parsed.data.text });
  await candidate.save();
  res.status(201).json(toCandidate(candidate));
}));

app.delete('/api/candidates/:id', asyncRoute(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  const candidate = await Candidate.findByIdAndDelete(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.status(204).send();
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}
app.use((error, _req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ error: 'A candidate with this email already exists for this role' });
  if (error?.name === 'ValidationError' || error?.name === 'CastError') return res.status(400).json({ error: 'Invalid candidate data' });
  if (process.env.NODE_ENV !== 'test') console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});
