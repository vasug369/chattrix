import { randomUUID } from 'crypto';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import mongoose from 'mongoose';

// Must be set before any src/ module imports config/env.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789';
process.env.OTP_TTL_MINUTES = '10';
process.env.OTP_MAX_ATTEMPTS = '5';

// One mongod for the whole run (see globalSetup.js), but a separate database
// per test file: mongoose is a process-wide singleton, so sharing a database
// meant one file's afterAll disconnect and afterEach wipe broke the next file.
const dbName = `test_${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  await mongoose.connect(`${inject('mongoUri')}${dbName}`);
});

afterEach(async () => {
  // Wipe between tests so ordering never matters. Deleting documents rather
  // than dropping the database keeps the indexes (the notification uniqueness
  // index in particular) that some tests depend on.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
