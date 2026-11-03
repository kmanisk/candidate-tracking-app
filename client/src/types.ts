export const STAGES = ['Applied', 'Screening', 'Interview', 'Selected', 'Rejected'] as const;
export type Stage = typeof STAGES[number];
export type View = 'overview' | 'candidates' | 'pipeline';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  stage: Stage;
  skills: string[];
  experience: number;
  location: string;
  source: string;
  interviewAt: string | null;
  notes: { id: string; text: string; author: string; createdAt: string }[];
  history: { from?: Stage; to: Stage; at: string }[];
  createdAt: string;
  updatedAt: string;
}
export interface CandidateInput {
  name: string;
  email: string;
  phone: string;
  role: string;
  stage: Stage;
  skills: string[];
  experience: number;
  location: string;
  source: string;
  interviewAt: string | null;
}
export interface Stats {
  total: number;
  byStage: Record<Stage, number>;
  upcoming: number;
  latest: Candidate[];
  roles: string[];
}
export interface Page {
  items: Candidate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
