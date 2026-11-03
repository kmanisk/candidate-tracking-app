import mongoose from 'mongoose';

export const STAGES = ['Applied', 'Screening', 'Interview', 'Selected', 'Rejected'];

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 1500 },
  author: { type: String, default: 'Recruiter' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const historySchema = new mongoose.Schema({
  from: { type: String, enum: STAGES },
  to: { type: String, required: true, enum: STAGES },
  at: { type: Date, default: Date.now },
}, { _id: false });

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  role: { type: String, required: true, trim: true, maxlength: 100 },
  stage: { type: String, enum: STAGES, default: 'Applied' },
  skills: [{ type: String, trim: true, maxlength: 40 }],
  experience: { type: Number, min: 0, max: 40, default: 0 },
  location: { type: String, default: '', trim: true },
  source: { type: String, default: 'Careers page', trim: true },
  interviewAt: { type: Date, default: null },
  notes: { type: [noteSchema], default: [] },
  history: { type: [historySchema], default: [] },
}, { timestamps: true, versionKey: false });

candidateSchema.index({ email: 1, role: 1 }, { unique: true });
candidateSchema.index({ stage: 1, updatedAt: -1 });
export const Candidate = mongoose.model('Candidate', candidateSchema);

export function toCandidate(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    name: obj.name,
    email: obj.email,
    phone: obj.phone || '',
    role: obj.role,
    stage: obj.stage,
    skills: obj.skills || [],
    experience: obj.experience || 0,
    location: obj.location || '',
    source: obj.source || '',
    interviewAt: obj.interviewAt || null,
    notes: (obj.notes || []).map(n => ({
      id: String(n._id),
      text: n.text,
      author: n.author,
      createdAt: n.createdAt,
    })),
    history: obj.history || [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}
