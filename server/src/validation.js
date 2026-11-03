import { z } from 'zod';
import { STAGES } from './model.js';

const short = max => z.string().trim().max(max);
const emptyOrDate = z.union([
  z.iso.datetime({ offset: true }),
  z.null(),
  z.literal(''),
]).transform(value => value || null);

export const candidateInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200).transform(v => v.toLowerCase()),
  phone: short(30).default(''),
  role: z.string().trim().min(2).max(100),
  stage: z.enum(STAGES).default('Applied'),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  experience: z.number().min(0).max(40).default(0),
  location: short(120).default(''),
  source: short(100).default('Careers page'),
  interviewAt: emptyOrDate.default(null),
}).strict();

export const candidatePatch = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.email().max(200).transform(v => v.toLowerCase()).optional(),
  phone: short(30).optional(),
  role: z.string().trim().min(2).max(100).optional(),
  stage: z.enum(STAGES).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  experience: z.number().min(0).max(40).optional(),
  location: short(120).optional(),
  source: short(100).optional(),
  interviewAt: emptyOrDate.optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'At least one field is required');
export const stageInput = z.object({ stage: z.enum(STAGES) }).strict();
export const noteInput = z.object({ text: z.string().trim().min(1).max(1500) }).strict();
export const pageInput = z.coerce.number().int().min(1).max(10000).default(1);
export const limitInput = z.coerce.number().int().min(1).max(50).default(10);
