import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { createPost, createUser } from './helpers.js';

/**
 * Compression is mounted, but "mounted" is not the same as "applies". These
 * assert the header on a real response, because the failure mode being guarded
 * against is silent: a misordered middleware stack still serves every request
 * correctly, just uncompressed, which is exactly how it went unnoticed in
 * production until the header was checked by hand.
 */
describe('response compression', () => {
  it('compresses a JSON response large enough to be worth it', async () => {
    const { agent } = await createUser();

    // The default threshold is 1KB, so the response has to clear it.
    for (let i = 0; i < 6; i += 1) {
      await createPost(agent, {
        title: `Compressible post number ${i}`,
        content: 'Lorem ipsum dolor sit amet, '.repeat(20),
      });
    }

    const res = await agent
      .get('/api/post/feed')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('leaves a small response alone', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    // Below the threshold, compressing costs CPU and saves almost nothing.
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('does not compress for a client that cannot decode it', async () => {
    const { agent } = await createUser();

    for (let i = 0; i < 6; i += 1) {
      await createPost(agent, {
        title: `Post ${i}`,
        content: 'Lorem ipsum dolor sit amet, '.repeat(20),
      });
    }

    const res = await agent
      .get('/api/post/feed')
      .set('Accept-Encoding', 'identity')
      .expect(200);

    expect(res.headers['content-encoding']).toBeUndefined();
  });
});
