import type { Candidate, CandidateInput, Stage } from './types';

export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
export const formatDate = (iso: string | null) => iso ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';
export const shortDate = (iso: string | null) => iso ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso)) : '—';
export const stageClass = (stage: Stage) => 'stage-' + stage.toLowerCase();
export const emptyForm = (): CandidateInput => ({
  name: '', email: '', phone: '', role: '', stage: 'Applied', skills: [],
  experience: 0, location: '', source: 'Careers page', interviewAt: null,
});
export const candidateForm = (candidate: Candidate): CandidateInput => ({
  name: candidate.name, email: candidate.email, phone: candidate.phone,
  role: candidate.role, stage: candidate.stage, skills: candidate.skills,
  experience: candidate.experience, location: candidate.location,
  source: candidate.source, interviewAt: candidate.interviewAt,
});
