import './config.js';
import mongoose from 'mongoose';
import { app } from './app.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required. Copy .env.example to .env.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 12000,
    maxPoolSize: 8,
    dbName: 'hireline',
  });
  const port = Number(process.env.PORT) || 4000;
  const server = app.listen(port, '0.0.0.0', () => console.log('Hireline listening on ' + port));
  const stop = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
  process.exit(1);
}
