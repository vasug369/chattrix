import { describe, expect, it } from 'vitest';
import env from '../src/config/env.js';
import Message from '../src/models/message.model.js';
import Post from '../src/models/post.model.js';
import { app, createPost, createUser, request, VALID_PASSWORD } from './helpers.js';

const EVIL_ORIGIN = 'https://evil.example';

describe('verified email is required to post, comment and message', () => {
  it('refuses an unverified account with 403, not 401', async () => {
    const unverified = await createUser({ verified: false });
    const other = await createUser();
    const post = await createPost(other.agent);

    // 403 keeps the client signed in: the frontend logs out on any 401.
    const create = await unverified.agent
      .post('/api/post/create')
      .send({ title: 'Spam title', content: 'Spam content' })
      .expect(403);
    expect(create.body.message).toMatch(/verify your email/i);

    await unverified.agent
      .post(`/api/post/${post._id}/comment`)
      .send({ content: 'Spam comment' })
      .expect(403);

    await unverified.agent
      .post(`/api/messages/send/${other.id}`)
      .send({ message: 'Spam message' })
      .expect(403);

    expect(await Post.countDocuments()).toBe(1);
    expect(await Message.countDocuments()).toBe(0);
  });

  it('still lets an unverified account read', async () => {
    const unverified = await createUser({ verified: false });
    await unverified.agent.get('/api/post/feed').expect(200);
    await unverified.agent.get('/api/user/me').expect(200);
  });

  it('lets a verified account post, comment and message', async () => {
    const a = await createUser();
    const b = await createUser();
    const post = await createPost(a.agent);

    await b.agent.post(`/api/post/${post._id}/comment`).send({ content: 'Nice post' }).expect(201);
    await b.agent.post(`/api/messages/send/${a.id}`).send({ message: 'Hello' }).expect(201);
  });
});

describe('cross-site request forgery protection', () => {
  it('refuses a state-changing request from a foreign origin', async () => {
    const victim = await createUser();

    const res = await victim.agent
      .post('/api/post/create')
      .set('Origin', EVIL_ORIGIN)
      .type('form')
      .send({ title: 'Forged title', content: 'Forged content' })
      .expect(403);

    expect(res.body.message).toMatch(/origin not allowed/i);
    expect(await Post.countDocuments()).toBe(0);
  });

  it('refuses a forged message even with a valid session', async () => {
    const victim = await createUser();
    const target = await createUser();

    await victim.agent
      .post(`/api/messages/send/${target.id}`)
      .set('Origin', EVIL_ORIGIN)
      .type('form')
      .send({ message: 'Forged message' })
      .expect(403);

    expect(await Message.countDocuments()).toBe(0);
  });

  it('refuses a forged login (login CSRF)', async () => {
    const user = await createUser();
    await request(app)
      .post('/api/auth/login')
      .set('Origin', EVIL_ORIGIN)
      .send({ email: user.payload.email, password: VALID_PASSWORD })
      .expect(403);
  });

  it('refuses the opaque "null" origin sent by sandboxed pages', async () => {
    const victim = await createUser();
    await victim.agent
      .post('/api/post/create')
      .set('Origin', 'null')
      .send({ title: 'Forged title', content: 'Forged content' })
      .expect(403);
  });

  it('allows the same request from an allow-listed origin', async () => {
    const user = await createUser();
    await user.agent
      .post('/api/post/create')
      .set('Origin', env.corsOrigins[0])
      .send({ title: 'Real title', content: 'Real content' })
      .expect(201);
  });

  it('allows requests without an Origin header (non-browser clients)', async () => {
    const user = await createUser();
    await createPost(user.agent);
    expect(await Post.countDocuments()).toBe(1);
  });

  it('does not block reads from a foreign origin', async () => {
    // CORS still hides the response from the foreign page; reads change nothing.
    await request(app).get('/api/health').set('Origin', EVIL_ORIGIN).expect(200);
  });
});

describe('session cookies', () => {
  it('are httpOnly and SameSite=Lax', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.payload.email, password: VALID_PASSWORD })
      .expect(200);

    const session = (res.headers['set-cookie'] ?? []).filter((c) => /^(token|refreshToken)=/.test(c));

    expect(session).toHaveLength(2);
    for (const cookie of session) {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    }
  });
});
