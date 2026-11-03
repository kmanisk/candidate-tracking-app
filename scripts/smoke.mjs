import assert from 'node:assert/strict';

const base = (process.argv[2] || 'http://127.0.0.1:4000').replace(/\/$/, '');
const email = 'smoke-' + Date.now() + '@example.com';
let id = '';

async function call(path, options) {
  const response = await fetch(base + '/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const body = response.status === 204 ? null : await response.json();
  return { status: response.status, body };
}
const body = payload => JSON.stringify(payload);
try {
  let result = await call('/health');
  assert.equal(result.status, 200, 'MongoDB must be connected');

  result = await call('/candidates', {
    method: 'POST',
    body: body({ name: 'Smoke Test Candidate', email, role: 'Full Stack Developer', skills: ['React', 'Express'], experience: 2 }),
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  id = result.body.id;
  assert.equal(result.body.stage, 'Applied');

  result = await call('/candidates?search=' + encodeURIComponent(email));
  assert.equal(result.status, 200);
  assert.equal(result.body.total, 1, 'Search finds saved record');
  assert.equal(result.body.items[0].id, id);

  result = await call('/candidates?stage=Interview');
  assert.equal(result.status, 200);
  assert.ok(!result.body.items.some(c => c.id === id), 'Stage filter excludes other stages');

  result = await call('/candidates/' + id + '/stage', { method: 'PATCH', body: body({ stage: 'Interview' }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.stage, 'Interview');
  assert.equal(result.body.history.at(-1).to, 'Interview');

  result = await call('/candidates/' + id + '/notes', { method: 'POST', body: body({ text: 'Successful API smoke test.' }) });
  assert.equal(result.status, 201);
  assert.ok(result.body.notes.some(n => n.text === 'Successful API smoke test.'));

  result = await call('/candidates/' + id, { method: 'PATCH', body: body({ location: 'Remote', experience: 3 }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.location, 'Remote');
  assert.equal(result.body.experience, 3);
  assert.equal(result.body.stage, 'Interview', 'Partial update must preserve stage');

  result = await call('/candidates', {
    method: 'POST',
    body: body({ name: 'Duplicate Applicant', email, role: 'Full Stack Developer' }),
  });
  assert.equal(result.status, 409, 'Duplicate applicant should be rejected');

  result = await call('/candidates', {
    method: 'POST',
    body: body({ name: 'Bad', email: 'not-an-email', role: 'Engineer' }),
  });
  assert.equal(result.status, 400, 'Invalid candidate should be rejected');

  result = await call('/stats');
  assert.equal(result.status, 200);
  assert.ok(result.body.total >= 1);

  console.log('PASS: health, create, search, filter, stage/history, notes, edit, duplicate, validation, stats');
} finally {
  if (id) {
    const deleted = await call('/candidates/' + id, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
    const missing = await call('/candidates/' + id);
    assert.equal(missing.status, 404);
    console.log('PASS: delete and 404 verification');
  }
}
