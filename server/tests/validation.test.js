import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateInput, candidatePatch, stageInput, noteInput, pageInput } from '../src/validation.js';

const valid = { name: 'Test Candidate', email: 'TEST@EXAMPLE.COM', role: 'Backend Engineer', skills: ['Node.js'], experience: 3 };

test('create candidate input validates and normalizes email', () => {
  const result = candidateInput.parse(valid);
  assert.equal(result.email, 'test@example.com');
  assert.equal(result.stage, 'Applied');
  assert.deepEqual(result.skills, ['Node.js']);
});
test('rejects invalid applicant name, email, and stage', () => {
  assert.equal(candidateInput.safeParse({ ...valid, name: 'a' }).success, false);
  assert.equal(candidateInput.safeParse({ ...valid, email: 'invalid' }).success, false);
  assert.equal(candidateInput.safeParse({ ...valid, stage: 'Hired' }).success, false);
});
test('rejects unknown fields to prevent mass assignment', () => {
  assert.equal(candidateInput.safeParse({ ...valid, isAdmin: true }).success, false);
  assert.equal(candidatePatch.safeParse({ _id: 'abc' }).success, false);
  assert.equal(candidatePatch.safeParse({}).success, false);
});
test('stage, notes, and pagination are bounded', () => {
  assert.equal(stageInput.safeParse({ stage: 'Selected' }).success, true);
  assert.equal(stageInput.safeParse({ stage: 'Other' }).success, false);
  assert.equal(noteInput.safeParse({ text: '' }).success, false);
  assert.equal(pageInput.safeParse('-1').success, false);
});
