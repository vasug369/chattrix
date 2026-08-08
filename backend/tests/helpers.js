import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';

export const VALID_PASSWORD = 'Str0ngPassw0rd';

let counter = 0;
const uniqueEmail = () => `user${++counter}.${Date.now()}@example.com`;

/**
 * Create a user and return an agent with its session cookies already set.
 *
 * supertest's `agent` persists the httpOnly cookies the API sets, so tests
 * exercise the same cookie-based auth path as a browser rather than injecting
 * a hand-signed token.
 */
export const createUser = async (overrides = {}) => {
  const payload = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? VALID_PASSWORD,
  };

  await request(app).post('/api/auth/register').send(payload).expect(201);

  if (overrides.verified !== false) {
    await User.updateOne({ email: payload.email }, { $set: { isAccountVerified: true } });
  }

  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/login')
    .send({ email: payload.email, password: payload.password })
    .expect(200);

  const doc = await User.findOne({ email: payload.email });

  return { agent, user: doc, id: doc._id.toString(), payload, loginBody: login.body };
};

/** An agent with no cookies, for testing unauthenticated access. */
export const anonAgent = () => request(app);

export const createPost = async (agent, overrides = {}) => {
  const res = await agent
    .post('/api/post/create')
    .send({
      title: overrides.title ?? 'A test post title',
      content: overrides.content ?? 'Some test post content.',
    })
    .expect(201);
  return res.body.data;
};

export { app, request };
