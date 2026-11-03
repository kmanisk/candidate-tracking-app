import './config.js';
import mongoose from 'mongoose';
import { app } from './app.js';
import { User, Session } from './auth.js';

const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log('Hireline listening on port ' + port);
});

let stopping = false;
async function connectDatabase() {
  if (stopping || !process.env.MONGODB_URI) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 8,
      dbName: 'hireline',
    });
    await Promise.all([User.init(), Session.init()]);
    console.log('Connected to MongoDB Atlas; authentication indexes ready');
  } catch (error) {
    console.error('MongoDB temporarily unavailable: ' + error.message);
    if (stopping) return;
    await mongoose.disconnect().catch(() => {});
    const retry = setTimeout(() => void connectDatabase(), 30000);
    retry.unref();
  }
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not configured; the frontend is available but database API requests will fail until it is set.');
} else {
  void connectDatabase();
}

async function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
