/**
 * Manual cleanup: node scripts/cleanupDuplicateSessions.js
 * Server start zamanı da eyni məntiq işləyir (ensureSessionIntegrity).
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { ensureSessionIntegrity } from '../utils/ensureSessionIntegrity.js';

await mongoose.connect(process.env.CONNECTING_MONGO_DB);
const summary = await ensureSessionIntegrity();
console.log('Done:', summary);
await mongoose.disconnect();
