import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// npm workspaces execute server scripts from server/, not the repository root.
// Cloud environment variables take precedence over values in the local .env.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
