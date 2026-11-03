# Hireline ATS — Product specification

## Scope

Target user: recruiter evaluating applicants for one or more job roles.

Primary flow: add a candidate → see in list/dashboard → search/filter → move through recruitment stages → record notes and interview details → edit/remove candidate.

In scope: React/TypeScript client, Express JSON API, MongoDB/Mongoose persistence, stages, notes, history, dashboard stats, filtering, pagination, deployment, responsive UI, validation/tests.

Out of scope: authentication/authorization (public sample-data-only demo), multi-tenant organizations, job postings CRUD, candidate self-service, resume attachments, email/calendar integration, real AI scoring, payroll.

## Canonical stages

Applied, Screening, Interview, Selected, Rejected.

Stages are stored as strings and validated on the server. History is append-only per stage change; repeated no-op stage transitions do not create events.

## Data

Candidates: name, email, optional phone, role, stage, skills[], experience years, optional location, source, optional interviewAt ISO timestamp, notes[], history[], timestamps.

Uniqueness: lowercase email + role. Treat duplicate key as HTTP 409.

No real personal information: seeded entries are fictional with example.com emails.

## API contract

- `GET /api/health` -> 200 when Mongo is connected, otherwise 503
- `GET /api/stats` -> total, byStage, upcoming (Interview stage and next seven days), latest 5, distinct roles
- `GET /api/candidates` -> { items, total, page, limit, pages }, with search/stage/role/skill filters
- `POST /api/candidates` -> 201 and candidate
- `GET /api/candidates/:id` -> candidate or 404
- `PATCH /api/candidates/:id` -> changed candidate or 404
- `PATCH /api/candidates/:id/stage` -> changed candidate and history
- `POST /api/candidates/:id/notes` -> 201 and updated candidate
- `DELETE /api/candidates/:id` -> 204

Invalid fields and input -> 400. Duplicate email+role -> 409. Invalid identifier -> 400. Missing record -> 404. Unexpected error -> 500 without internal details.

## Acceptance criteria

1. Create candidate and observe it in list, dashboard, and MongoDB after reload.
2. Search by name, email, role, and skills; filter by stage, role, and skill. Pagination supports many records.
3. Edit candidate and move stage through board/profile; stage history records the move.
4. Add notes; notes persist after refresh.
5. Delete with confirmation; record disappears from list and counts.
6. Invalid requests are rejected; duplicates are rejected; no secret reaches client bundle or Git.
7. Build, unit validation tests, and live CRUD smoke test succeed.
8. Render health endpoint is reachable at the public URL.
