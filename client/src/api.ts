import type { Candidate, CandidateInput, Page, Stage, Stats } from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('Unable to connect to the server. Check your connection and try again.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.details?.[0]?.message;
    throw new Error(detail || data.error || 'Request failed (' + response.status + ')');
  }
  return data as T;
}

export const api = {
  stats: () => request<Stats>('/stats'),
  list: (params: URLSearchParams) => request<Page>('/candidates?' + params),
  get: (id: string) => request<Candidate>('/candidates/' + id),
  create: (data: CandidateInput) => request<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CandidateInput) => request<Candidate>('/candidates/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  stage: (id: string, stage: Stage) => request<Candidate>('/candidates/' + id + '/stage', { method: 'PATCH', body: JSON.stringify({ stage }) }),
  note: (id: string, text: string) => request<Candidate>('/candidates/' + id + '/notes', { method: 'POST', body: JSON.stringify({ text }) }),
  remove: (id: string) => request<void>('/candidates/' + id, { method: 'DELETE' }),
};
