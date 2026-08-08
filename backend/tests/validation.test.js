import { describe, expect, it } from 'vitest';
import Post from '../src/models/post.model.js';
import { createPost, createUser } from './helpers.js';

describe('request validation', () => {
  it('rejects a malformed ObjectId with 422 rather than a 500 cast error', async () => {
    const { agent } = await createUser();
    // Previously this reached Mongoose, threw a CastError, and surfaced as a
    // 500 whose body echoed the internal message.
    const res = await agent.get('/api/post/not-a-valid-id').expect(422);
    expect(res.body.details.fields).toHaveProperty('id');
  });

  it('rejects an empty comment', async () => {
    const { agent } = await createUser();
    const post = await createPost(agent);
    const res = await agent.post(`/api/post/${post._id}/comment`).send({ content: '   ' }).expect(422);
    expect(res.body.details.fields).toHaveProperty('content');
  });

  it('enforces the comment length limit', async () => {
    const { agent } = await createUser();
    const post = await createPost(agent);
    await agent
      .post(`/api/post/${post._id}/comment`)
      .send({ content: 'x'.repeat(1001) })
      .expect(422);
  });

  it('rejects a post with a too-short title', async () => {
    const { agent } = await createUser();
    const res = await agent.post('/api/post/create').send({ title: 'ab', content: 'ok' }).expect(422);
    expect(res.body.details.fields).toHaveProperty('title');
  });

  it('trims whitespace before persisting', async () => {
    const { agent } = await createUser();
    const res = await agent
      .post('/api/post/create')
      .send({ title: '   Padded title   ', content: '  padded content  ' })
      .expect(201);
    expect(res.body.data.title).toBe('Padded title');
    expect(res.body.data.content).toBe('padded content');
  });

  it('requires at least one field on an update', async () => {
    const { agent } = await createUser();
    const post = await createPost(agent);
    await agent.put(`/api/post/update/${post._id}`).send({}).expect(422);
  });

  it('rejects an unknown field in a profile update', async () => {
    const { agent } = await createUser();
    // `.strict()` on the schema: unknown keys are an error, not silently
    // dropped, so a typo'd field never looks like it succeeded.
    await agent.patch('/api/user/me').send({ name: 'Fine', role: 'admin' }).expect(422);
  });

  it('rejects a bio longer than 160 characters', async () => {
    const { agent } = await createUser();
    await agent.patch('/api/user/me').send({ bio: 'x'.repeat(161) }).expect(422);
  });

  it('coerces and clamps pagination parameters', async () => {
    const { agent } = await createUser();

    const res = await agent.get('/api/post?page=2&limit=5').expect(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.limit).toBe(5);

    // limit is capped at 50, so a caller cannot ask for the whole table.
    await agent.get('/api/post?limit=5000').expect(422);
    await agent.get('/api/post?page=0').expect(422);
    await agent.get('/api/post?page=abc').expect(422);
  });

  it('requires a search query', async () => {
    const { agent } = await createUser();
    await agent.get('/api/post/search').expect(422);
    await agent.get('/api/post/search?q=').expect(422);
  });

  it('rejects an oversized message', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    await sender.agent
      .post(`/api/messages/send/${receiver.id}`)
      .send({ message: 'x'.repeat(2001) })
      .expect(422);
  });

  it('rejects an empty message', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    await sender.agent.post(`/api/messages/send/${receiver.id}`).send({ message: '  ' }).expect(422);
  });

  it('returns a 404 for an unknown route rather than hanging', async () => {
    const res = await createUser().then(({ agent }) => agent.get('/api/does-not-exist'));
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('search input is treated as data, not as a pattern', () => {
  it('escapes regex metacharacters instead of matching everything', async () => {
    const { agent } = await createUser();
    await createPost(agent, { title: 'Alpha post', content: 'first' });
    await createPost(agent, { title: 'Beta post', content: 'second' });

    // Unescaped, '.*' matched every document. Escaped, it matches none.
    const wildcard = await agent.get('/api/post/search?q=.*').expect(200);
    expect(wildcard.body.items).toHaveLength(0);

    const literal = await agent.get('/api/post/search?q=Alpha').expect(200);
    expect(literal.body.items).toHaveLength(1);
  });

  it('survives a catastrophic-backtracking pattern', async () => {
    const { agent } = await createUser();
    await createPost(agent, { title: 'aaaaaaaaaaaaaaaaaaaaaaaaa', content: 'x' });

    // A ReDoS payload: with the input escaped it is just a literal string.
    const started = Date.now();
    await agent.get(`/api/post/search?q=${encodeURIComponent('(a+)+$')}`).expect(200);
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('finds posts by a literal substring of the content', async () => {
    const { agent } = await createUser();
    await createPost(agent, { title: 'Findable title', content: 'a distinctive phrase' });
    const res = await agent.get('/api/post/search?q=distinctive').expect(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('body size limits', () => {
  it('rejects a JSON body over the 1MB cap', async () => {
    const { agent } = await createUser();
    const res = await agent
      .post('/api/post/create')
      .send({ title: 'Big', content: 'x'.repeat(1024 * 1024 + 100) });
    // Without a limit, express buffers unbounded input into memory.
    expect([413, 422]).toContain(res.status);
    expect(await Post.countDocuments()).toBe(0);
  });
});
