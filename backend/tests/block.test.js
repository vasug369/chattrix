import { describe, expect, it } from 'vitest';
import Notification from '../src/models/notification.model.js';
import User from '../src/models/user.model.js';
import { anonAgent, createPost, createUser } from './helpers.js';

/** `blocker` blocks `blocked`; returns both plus a post by each. */
const setup = async () => {
  const blocker = await createUser({ name: 'Blocker Person' });
  const blocked = await createUser({ name: 'Blocked Person' });
  const blockerPost = await createPost(blocker.agent, { title: 'Blocker post title', content: 'zebra blocker words' });
  const blockedPost = await createPost(blocked.agent, { title: 'Blocked post title', content: 'zebra blocked words' });
  await blocker.agent.put(`/api/user/${blocked.id}/block`).expect(200);
  return { blocker, blocked, blockerPost, blockedPost };
};

describe('block endpoint', () => {
  it('requires a session', async () => {
    const target = await createUser();
    await anonAgent().put(`/api/user/${target.id}/block`).expect(401);
  });

  it('validates the id', async () => {
    const { agent } = await createUser();
    await agent.put('/api/user/not-an-id/block').expect(422);
  });

  it('refuses to block yourself and unknown users', async () => {
    const { agent, id } = await createUser();
    await agent.put(`/api/user/${id}/block`).expect(400);
    await agent.put('/api/user/507f1f77bcf86cd799439011/block').expect(404);
  });

  it('removes follows in both directions and the notifications between them', async () => {
    const a = await createUser();
    const b = await createUser();
    await a.agent.put(`/api/user/${b.id}/follow`).expect(200);
    await b.agent.put(`/api/user/${a.id}/follow`).expect(200);
    expect(await Notification.countDocuments()).toBe(2);

    await a.agent.put(`/api/user/${b.id}/block`).expect(200);

    const [ua, ub] = await Promise.all([User.findById(a.id), User.findById(b.id)]);
    expect(ua.following).toHaveLength(0);
    expect(ua.followers).toHaveLength(0);
    expect(ub.following).toHaveLength(0);
    expect(ub.followers).toHaveLength(0);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('never exposes the blocked list on user objects', async () => {
    const { blocker, blocked } = await setup();
    const me = await blocker.agent.get(`/api/user/${blocker.id}`).expect(200);
    expect(me.body.data.blocked).toBeUndefined();
    const other = await blocker.agent.get(`/api/user/${blocked.id}`).expect(200);
    expect(other.body.data.blocked).toBeUndefined();
  });

  it('lists and unblocks', async () => {
    const { blocker, blocked } = await setup();
    const list = await blocker.agent.get('/api/user/me/blocked').expect(200);
    expect(list.body.items.map((u) => u._id)).toEqual([blocked.id]);
    expect(list.body.items[0].name).toBe('Blocked Person');

    await blocker.agent.put(`/api/user/${blocked.id}/unblock`).expect(200);
    const after = await blocker.agent.get('/api/user/me/blocked').expect(200);
    expect(after.body.items).toEqual([]);
    await blocked.agent.post(`/api/messages/send/${blocker.id}`).send({ message: 'hi again' }).expect(201);
  });
});

describe('what a block hides', () => {
  it('hides the blocker’s profile from the blocked user, but not the reverse', async () => {
    const { blocker, blocked } = await setup();
    await blocked.agent.get(`/api/user/${blocker.id}`).expect(404);
    const res = await blocker.agent.get(`/api/user/${blocked.id}`).expect(200);
    expect(res.body.data.isBlocked).toBe(true);
  });

  it('returns no posts for a blocked pair, both ways', async () => {
    const { blocker, blocked } = await setup();
    const a = await blocked.agent.get(`/api/post/getUserPosts/${blocker.id}`).expect(200);
    const b = await blocker.agent.get(`/api/post/getUserPosts/${blocked.id}`).expect(200);
    expect(a.body.items).toEqual([]);
    expect(b.body.items).toEqual([]);
  });

  it('removes each other’s posts from lists and search', async () => {
    const { blocker, blocked, blockerPost, blockedPost } = await setup();

    const all = await blocked.agent.get('/api/post').expect(200);
    expect(all.body.items.map((p) => p._id)).toEqual([blockedPost._id]);

    const search = await blocker.agent.get('/api/post/search?q=zebra').expect(200);
    expect(search.body.items.map((p) => p._id)).toEqual([blockerPost._id]);
  });

  it('hides a blocked author’s post by id', async () => {
    const { blocked, blockerPost } = await setup();
    await blocked.agent.get(`/api/post/${blockerPost._id}`).expect(404);
  });

  it('refuses likes and comments across a block', async () => {
    const { blocked, blockerPost } = await setup();
    await blocked.agent.put(`/api/post/${blockerPost._id}/like`).expect(404);
    await blocked.agent.post(`/api/post/${blockerPost._id}/comment`).send({ content: 'hello' }).expect(404);
  });

  it('hides comments by blocked users on other people’s posts', async () => {
    const { blocker, blocked } = await setup();
    const third = await createUser();
    const post = await createPost(third.agent, { title: 'Neutral ground' });
    await blocked.agent.post(`/api/post/${post._id}/comment`).send({ content: 'from blocked' }).expect(201);
    await third.agent.post(`/api/post/${post._id}/comment`).send({ content: 'from third' }).expect(201);

    const seen = await blocker.agent.get(`/api/post/${post._id}`).expect(200);
    expect(seen.body.data.comments.map((c) => c.content)).toEqual(['from third']);

    await blocker.agent.put(`/api/user/${third.id}/follow`).expect(200);
    const feed = await blocker.agent.get('/api/post/feed').expect(200);
    const inFeed = feed.body.items.find((p) => p._id === post._id);
    expect(inFeed.comments.map((c) => c.content)).toEqual(['from third']);
  });

  it('refuses follows across a block, both ways', async () => {
    const { blocker, blocked } = await setup();
    await blocked.agent.put(`/api/user/${blocker.id}/follow`).expect(403);
    await blocker.agent.put(`/api/user/${blocked.id}/follow`).expect(403);
  });

  it('refuses messages across a block, both ways, and drops the inbox entry', async () => {
    const a = await createUser();
    const b = await createUser();
    await a.agent.post(`/api/messages/send/${b.id}`).send({ message: 'before' }).expect(201);
    await a.agent.put(`/api/user/${b.id}/block`).expect(200);

    await b.agent.post(`/api/messages/send/${a.id}`).send({ message: 'let me in' }).expect(403);
    await a.agent.post(`/api/messages/send/${b.id}`).send({ message: 'oops' }).expect(403);

    const inboxA = await a.agent.get('/api/messages/users').expect(200);
    const inboxB = await b.agent.get('/api/messages/users').expect(200);
    expect(inboxA.body.items).toEqual([]);
    expect(inboxB.body.items).toEqual([]);
  });

  it('removes each other from people search', async () => {
    const { blocker, blocked } = await setup();
    const res = await blocked.agent.get('/api/user/search?q=Person').expect(200);
    expect(res.body.items.map((u) => u._id)).not.toContain(blocker.id);
    const res2 = await blocker.agent.get('/api/user/search?q=Person').expect(200);
    expect(res2.body.items.map((u) => u._id)).not.toContain(blocked.id);
  });
});
