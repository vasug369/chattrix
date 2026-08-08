import fs from 'fs';
import path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Start exactly one MongoDB for the whole run.
 *
 * Doing this in `setupFiles` instead started (and stopped) a fresh mongod for
 * every test file — seven spin-ups per run, one of which routinely blew the
 * 10s start timeout and failed the suite for no real reason.
 */
let mongoServer;
let dbPath;

export default async function setup({ provide }) {
  if (!process.env.MONGOMS_SYSTEM_BINARY) {
    // The bundled downloader fetches a ~100MB binary on first run. When the
    // machine already has a mongod, reuse it. MONGOMS_VERSION just silences
    // the "possible version conflict" notice by declaring what we actually run.
    process.env.MONGOMS_SYSTEM_BINARY = '/usr/bin/mongod';
    process.env.MONGOMS_VERSION ??= '7.0.14';
  }

  // "Memory" server is a misnomer: it writes a real WiredTiger directory. On
  // tmpfs that write is free, which matters on a nearly-full disk.
  if (fs.existsSync('/dev/shm')) {
    dbPath = fs.mkdtempSync(path.join('/dev/shm', 'chattrix-test-'));
  }

  mongoServer = await MongoMemoryServer.create({
    instance: { ...(dbPath ? { dbPath, storageEngine: 'wiredTiger' } : {}) },
  });

  // Base URI without a database name — each test file appends its own, so
  // files stay isolated while sharing one mongod process.
  provide('mongoUri', mongoServer.getUri());

  return async () => {
    await mongoServer?.stop();
    if (dbPath) fs.rmSync(dbPath, { recursive: true, force: true });
  };
}
