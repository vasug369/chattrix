import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // One in-memory MongoDB per worker; a single fork keeps startup cost down
    // and avoids parallel suites clearing each other's collections.
    pool: 'forks',
    maxForks: 1,
    minForks: 1,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js'],
    },
  },
});
