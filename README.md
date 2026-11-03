# Hireline — Candidate Tracking Application

A working full-stack Applicant Tracking System (ATS) built for a portfolio and technical interviews. Recruiters can manage applications from first contact through selection, with every change stored in MongoDB.

> **Public portfolio demo.** All preloaded records are fictional. This demo intentionally has no login: anyone with the URL can create, edit, and delete records. Do not store real applicant information in it.

## Features

- Recruitment overview with total candidates, interviews, selections, rejections, and stage distribution
- Add, view, edit, and delete applicants with validated forms and REST endpoints
- Search by candidate name, email, role, or skill; filter by stage, role, or specific skill
- Server-side pagination (10 results per page; maximum API limit 50)
- Five-stage hiring board: Applied → Screening → Interview → Selected / Rejected
- Move applicants using drag-and-drop or accessible stage selectors
- Candidate profiles, contact details, skills, interview date, notes, and change history
- Responsive interface and keyboard-visible focus states
- Seed command for **fictional** example data; never silently overwrites existing data
- Input validation, bounded requests, security headers, error handling, health endpoint, tests, and CI

## Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4 + custom styles, Lucide icons.

**Backend:** Node.js 22+, Express 5, Zod 4, Mongoose 8.

**Database:** MongoDB / MongoDB Atlas. Production serves the SPA and API from one Render Node web service.

## Quick start

Prerequisites: Node.js >= 22.12, npm, and a MongoDB deployment.

```bash
git clone https://github.com/kmanisk/candidate-tracking-app.git
cd candidate-tracking-app
npm ci
cp .env.example .env
# Edit .env and set MONGODB_URI (do not commit it)
npm run seed:if-empty
npm run dev
```

Open `http://localhost:5173`. The Vite frontend proxies `/api` to Express on `http://localhost:4000`.

To test the production bundle locally:

```bash
npm run check
npm start
# http://localhost:4000
```

## API

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Database readiness |
| GET | `/api/stats` | Totals, stage counts, upcoming interviews, recent candidates |
| GET | `/api/candidates` | Paginated list; accepts `page`, `limit`, `search`, `stage`, `role`, `skill` |
| GET | `/api/candidates/:id` | Candidate profile |
| POST | `/api/candidates` | Create candidate |
| PATCH | `/api/candidates/:id` | Edit candidate |
| PATCH | `/api/candidates/:id/stage` | Update stage with historical record |
| POST | `/api/candidates/:id/notes` | Append recruiter note |
| DELETE | `/api/candidates/:id` | Delete candidate (204) |

Example:

```bash
curl -X POST http://localhost:4000/api/candidates \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Applicant","email":"test-applicant@example.com","role":"Full Stack Developer","skills":["React","Node.js"],"experience":2}'
```

### Data model

Each candidate has a name, email, phone, role, stage, skills, experience, location, source, interview date, notes, stage history, and created/updated timestamps. The `(email, role)` compound index prevents duplicate applications for the same role.

## Validation and smoke testing

```bash
npm test           # Node's built-in test runner (validation)
npm run build      # TypeScript typecheck + Vite production build
node scripts/smoke.mjs http://localhost:4000
```

The smoke test creates a synthetic applicant, searches it, updates the stage, adds a note, edits profile details, confirms duplicates are rejected, and deletes the test record. The CI workflow runs validation tests and a production build on pushes and pull requests.

## Deployment (Render)

The project is designed as a **single Node service**: one URL serves the React build and Express routes, so CORS and frontend environment variables are unnecessary in production.

- Connect this GitHub repository to Render as a Node web service (free plan is enough for a demo).
- Build: `npm ci --include=dev && npm run build`
- Start: `npm run seed:if-empty && npm start`
- Set `MONGODB_URI` as a **secret environment variable** and `NODE_ENV=production`.
- Health check: `/api/health`.
- Never place MongoDB passwords in Git, README, client files, or screenshots.

A `render.yaml` blueprint is provided for reproducibility.

## Known scope limits

This is intentionally an unauthenticated **portfolio demonstration**, not a production HR product. It does not include recruiter accounts, permissions, email invitations, file uploads, automated email, audit identities, or personal-data governance. Add authentication and proper organization-level authorization before handling real candidate data.

## Project documentation

- [SPEC.md](SPEC.md) — requirements, API, data model, and acceptance criteria
- [DESIGN.md](DESIGN.md) — screen layout, tokens, responsive behavior
- [AGENTS.md](AGENTS.md) — development rules and testing expectations
