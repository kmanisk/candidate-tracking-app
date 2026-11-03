import type { Candidate, CandidateInput, Page, Stage, Stats } from './types';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}
export type AuthStatus =
  | { authenticated: true; setupRequired: false; user: AuthUser; csrfToken: string }
  | { authenticated: false; setupRequired: boolean; setupAvailable: boolean };
export interface AuthSuccess { user: AuthUser; csrfToken: string }

let csrfToken = '';
export function setCsrfToken(value: string) { csrfToken = value; }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const method = init?.method?.toUpperCase() || 'GET';
  const modifies = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  try {
    response = await fetch('/api' + url, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(modifies ? { 'Content-Type': 'application/json' } : {}),
        ...(modifies && csrfToken && !['/auth/setup', '/auth/login'].includes(url) ? { 'X-Hireline-CSRF': csrfToken } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Unable to connect to the server. Check your connection and try again.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/auth/')) {
      setCsrfToken('');
      window.dispatchEvent(new CustomEvent('hireline:session-expired'));
    }
    const detail = data.details?.[0]?.message;
    throw new Error(detail || data.error || 'Request failed (' + response.status + ')');
  }
  return data as T;
}

export const api = {
  authStatus: () => request<AuthStatus>('/auth/status'),
  setup: (data: { username: string; displayName: string; password: string; setupToken: string }) =>
    request<AuthSuccess>('/auth/setup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request<AuthSuccess>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>('/auth/password', { method: 'PATCH', body: JSON.stringify(data) }),
  health: () => request<{ status: string }>('/health'),
  stats: () => request<Stats>('/stats'),
  upcoming: () => request<{ items: Candidate[] }>('/interviews/upcoming'),
  list: (params: URLSearchParams) => request<Page>('/candidates?' + params),
  get: (id: string) => request<Candidate>('/candidates/' + id),
  create: (data: CandidateInput) => request<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CandidateInput) => request<Candidate>('/candidates/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  stage: (id: string, stage: Stage) => request<Candidate>('/candidates/' + id + '/stage', { method: 'PATCH', body: JSON.stringify({ stage }) }),
  note: (id: string, text: string) => request<Candidate>('/candidates/' + id + '/notes', { method: 'POST', body: JSON.stringify({ text }) }),
  remove: (id: string) => request<void>('/candidates/' + id, { method: 'DELETE' }),
};
