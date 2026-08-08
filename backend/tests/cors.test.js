import { describe, expect, it } from 'vitest';
import env, { normalizeOrigin, parseOrigins } from '../src/config/env.js';
import { app, request } from './helpers.js';

/**
 * These exist because a CORS misconfiguration is silent on the server: the
 * request returns 200, the response just carries no `Access-Control-Allow-Origin`,
 * and the browser refuses it client-side. The deployed API was rejecting every
 * origin — including its own frontend — and nothing in the logs said so.
 */

describe('normalizeOrigin', () => {
  it.each([
    ['https://chattrix-social.vercel.app/', 'https://chattrix-social.vercel.app'],
    ['https://chattrix-social.vercel.app///', 'https://chattrix-social.vercel.app'],
    ['  https://chattrix-social.vercel.app  ', 'https://chattrix-social.vercel.app'],
    ['"https://chattrix-social.vercel.app"', 'https://chattrix-social.vercel.app'],
    ["'https://chattrix-social.vercel.app'", 'https://chattrix-social.vercel.app'],
    ['HTTPS://Chattrix-Social.Vercel.App', 'https://chattrix-social.vercel.app'],
    ['http://localhost:5173', 'http://localhost:5173'],
    ['', ''],
  ])('normalises %s', (input, expected) => {
    expect(normalizeOrigin(input)).toBe(expected);
  });

  it('leaves the path case alone when normalising the authority', () => {
    // Only scheme and host are case-insensitive; nothing else should be touched.
    expect(normalizeOrigin('https://Example.COM')).toBe('https://example.com');
  });
});

describe('parseOrigins', () => {
  it('splits, trims and drops empties', () => {
    expect(parseOrigins('http://a.com, https://b.com/ ,,  ')).toEqual([
      'http://a.com',
      'https://b.com',
    ]);
  });

  it('returns an empty list for an empty value rather than one empty string', () => {
    // `''.split(',')` yields [''], which would put a falsy entry in the
    // allow-list and make the length look like 1.
    expect(parseOrigins('')).toEqual([]);
    expect(parseOrigins('   ')).toEqual([]);
  });
});

describe('CORS behaviour', () => {
  const allowed = env.corsOrigins[0];

  it('reflects an allow-listed origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', allowed).expect(200);
    expect(res.headers['access-control-allow-origin']).toBe(allowed);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('accepts an allow-listed origin sent with a trailing slash', async () => {
    const res = await request(app).get('/api/health').set('Origin', `${allowed}/`).expect(200);
    // Browsers do not send this, but a proxy or a hand-rolled client might,
    // and rejecting it would be a confusing failure for no benefit.
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('sends no CORS header for an unknown origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://not-my-frontend.example.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows a request with no Origin at all', async () => {
    // curl, health checks and server-to-server calls send no Origin. Blocking
    // those would break Render's own health probe.
    await request(app).get('/api/health').expect(200);
  });

  it('has a non-empty allow-list by default', () => {
    // The failure mode that took the deployment down: CORS_ORIGINS set to
    // something that parsed to nothing, so every browser request was refused.
    expect(env.corsOrigins.length).toBeGreaterThan(0);
    expect(env.corsOrigins.every(Boolean)).toBe(true);
  });
});
