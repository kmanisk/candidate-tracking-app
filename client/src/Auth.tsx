import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight, Check, CircleCheck, Eye, EyeOff, Fingerprint, KeyRound,
  LockKeyhole, ShieldCheck, X,
} from 'lucide-react';
import { api } from './api';
import type { AuthStatus, AuthSuccess, AuthUser } from './api';

type GuestStatus = Extract<AuthStatus, { authenticated: false }>;

export function AuthScreen({
  status,
  onAuthenticated,
}: {
  status: GuestStatus;
  onAuthenticated: (result: AuthSuccess) => void;
}) {
  const isSetup = status.setupRequired;
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (isSetup && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = isSetup
        ? await api.setup({ username, displayName, password, setupToken })
        : await api.login({ username, password });
      onAuthenticated(result);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-page">
    <section className="auth-story">
      <div className="auth-story-top">
        <span className="auth-logo"><span className="brand-mark">H</span><span>hireline<span className="brand-dot">.</span></span></span>
        <span className="auth-story-label">RECRUITMENT / WORKSPACE</span>
      </div>
      <div className="auth-story-main">
        <span className="auth-kicker"><span className="auth-kicker-dot" /> RECRUITMENT MADE CLEAR</span>
        <h1>Better hiring starts with <em>better organization.</em></h1>
        <p>Everything you need to move applicants from first contact to final decision, in one focused workspace.</p>
        <div className="auth-feature-list">
          <span><CircleCheck size={17} /> Organize every applicant</span>
          <span><CircleCheck size={17} /> Track each hiring stage</span>
          <span><CircleCheck size={17} /> Keep decisions in context</span>
        </div>
      </div>
      <div className="auth-story-footer"><span>HIRELINE / APPLICANT TRACKING</span><span>PRIVATE WORKSPACE</span></div>
      <div className="auth-deco auth-deco-one" /><div className="auth-deco auth-deco-two" />
    </section>

    <main className="auth-panel">
      <div className="auth-mobile-logo"><span className="auth-logo"><span className="brand-mark">H</span><span>hireline<span className="brand-dot">.</span></span></span></div>
      <div className="auth-form-wrap">
        <div className="auth-symbol"><Fingerprint size={25} strokeWidth={1.7} /></div>
        <div className="auth-eyebrow">{isSetup ? 'INITIAL WORKSPACE SETUP' : 'WELCOME BACK'}</div>
        <h2>{isSetup ? 'Create your account.' : 'Sign in to Hireline.'}</h2>
        <p className="auth-description">{isSetup
          ? 'Set up the first workspace owner. Only the owner can create this account.'
          : 'Enter your username and password to access your recruitment workspace.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isSetup && <label className="auth-field">Your name
            <input autoComplete="name" required minLength={2} maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Workspace owner" />
          </label>}
          <label className="auth-field">Username
            <input autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={40} pattern="[A-Za-z0-9_.-]+" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" />
          </label>
          <label className="auth-field">Password
            <div className="auth-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={isSetup ? 'new-password' : 'current-password'} required minLength={isSetup ? 12 : 1} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSetup ? 'At least 12 characters' : 'Enter your password'} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(s => !s)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </label>
          {isSetup && <>
            <label className="auth-field">Confirm password
              <input type="password" autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter password again" />
            </label>
            <label className="auth-field">Workspace setup key
              <div className="auth-input-with-icon"><KeyRound size={17} /><input type="password" autoComplete="off" required value={setupToken} onChange={e => setSetupToken(e.target.value)} placeholder="Key from Render environment" /></div>
            </label>
          </>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {isSetup && !status.setupAvailable && <div className="auth-error" role="alert">Owner setup is not yet enabled on the server. Configure HIRELINE_SETUP_TOKEN in Render.</div>}
          <button className="auth-submit" type="submit" disabled={busy || (isSetup && !status.setupAvailable)}>
            {busy ? 'Please wait…' : isSetup ? 'Create workspace owner' : 'Sign in'} <ArrowRight size={18} />
          </button>
        </form>
        <div className="auth-security"><ShieldCheck size={17} /><span>{isSetup ? 'The setup key is used only for first-time account creation.' : 'Your account is protected with an encrypted connection and secure session cookie.'}</span></div>
      </div>
      <div className="auth-panel-footer"><LockKeyhole size={14} /> Authorized recruiters only</div>
    </main>
  </div>;
}

export function PasswordDialog({
  user, onClose,
}: {
  user: AuthUser;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setSaved(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to change password.');
    } finally {
      setBusy(false);
    }
  }
  return <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="password-dialog" role="dialog" aria-modal="true" aria-label="Account security settings">
      <div className="modal-head">
        <div><div className="eyebrow">ACCOUNT / SECURITY</div><h2>Change password</h2><p>Signed in as @{user.username}</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Close account settings"><X size={20} /></button>
      </div>
      {saved ? <div className="password-saved"><span><Check size={25} /></span><h3>Password updated</h3><p>Other active sessions have been signed out.</p><button className="button button-primary" onClick={onClose}>Done</button></div> :
        <form className="password-form" onSubmit={submit}>
          <label className="auth-field">Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
          <label className="auth-field">New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} placeholder="At least 12 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
          <label className="auth-field">Confirm new password<input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="password-actions"><button className="button button-subtle" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Update password'} <ArrowRight size={16} /></button></div>
        </form>}
    </section>
  </div>;
}
