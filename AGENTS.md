# Agent rules

- Read SPEC.md and DESIGN.md before changing app behavior or UI.
- Preserve the React/Vite frontend + Express/Mongoose backend and single-origin deployment.
- Use the API/database as the source of truth. Never replace persistence with localStorage or fake state.
- Do not introduce real applicants or real PII; this is an unauthenticated demo.
- Do not commit .env, .atlas-claim.json, Mongo connection strings, credentials or generated dist.
- Keep CSS restrained and compact. Preserve keyboard focus, mobile layout and reduced motion.
- After code changes: run npm test, npm run build, and scripts/smoke.mjs against a live local/backend instance when the DB is available.
- On deployment: verify GET /api/health, GET /api/stats, and full create/search/update/notes/delete flow.
