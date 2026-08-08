import { describe, expect, it } from 'vitest';
import Notification from '../src/models/notification.model.js';
import { createPost, createUser } from './helpers.js';

describe('notification generation', () => {
  it('notifies the author when someone likes their post', async () => {
    const author = await createUser({ name: 'Author' });
    const liker = await createUser({ name: 'Liker' });
    const post = await createPost(author.agent, { title: 'Likeable post' });

    await liker.agent.put(`/api/post/${post._id}/like`).expect(200);

    const res = await author.agent.get('/api/notifications').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ type: 'like', readAt: null });
    expect(res.body.items[0].actor.name).toBe('Liker');
    expect(res.body.unread).toBe(1);
  });

  it('notifies the author when someone comments', async () => {
    const author = await createUser();
    const commenter = await createUser({ name: 'Commenter' });
    const post = await createPost(author.agent);

    await commenter.agent
      .post(`/api/post/${post._id}/comment`)
      .send({ content: 'Great write-up' })
      .expect(201);

    const res = await author.agent.get('/api/notifications').expect(200);
    expect(res.body.items[0]).toMatchObject({ type: 'comment', preview: 'Great write-up' });
  });

  it('notifies on a new follower', async () => {
    const target = await createUser();
    const follower = await createUser({ name: 'New Follower' });

    await follower.agent.put(`/api/user/${target.id}/follow`).expect(200);

    const res = await target.agent.get('/api/notifications').expect(200);
    expect(res.body.items[0].type).toBe('follow');
    expect(res.body.items[0].actor.name).toBe('New Follower');
  });

  it('notifies on a direct message', async () => {
    const sender = await createUser({ name: 'Sender' });
    const receiver = await createUser();

    await sender.agent
      .post(`/api/messages/send/${receiver.id}`)
      .send({ message: 'Hey there' })
      .expect(201);

    const res = await receiver.agent.get('/api/notifications').expect(200);
    expect(res.body.items[0]).toMatchObject({ type: 'message', preview: 'Hey there' });
  });

  it('never notifies a user about their own actions', async () => {
    const { agent } = await createUser();
    const post = await createPost(agent);

    await agent.put(`/api/post/${post._id}/like`).expect(200);
    await agent.post(`/api/post/${post._id}/comment`).send({ content: 'Self comment' }).expect(201);

    const res = await agent.get('/api/notifications').expect(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('collapses repeated like toggles into one notification', async () => {
    const author = await createUser();
    const liker = await createUser();
    const post = await createPost(author.agent);

    // Toggling like on/off repeatedly must not stack up rows — the partial
    // unique index plus an upsert collapses them.
    for (let i = 0; i < 3; i += 1) {
      await liker.agent.put(`/api/post/${post._id}/like`).expect(200); // like
      await liker.agent.put(`/api/post/${post._id}/like`).expect(200); // unlike
    }
    await liker.agent.put(`/api/post/${post._id}/like`).expect(200); // ends liked

    const res = await author.agent.get('/api/notifications').expect(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('withdraws the notification when a like is removed', async () => {
    const author = await createUser();
    const liker = await createUser();
    const post = await createPost(author.agent);

    await liker.agent.put(`/api/post/${post._id}/like`).expect(200);
    expect((await author.agent.get('/api/notifications')).body.items).toHaveLength(1);

    await liker.agent.put(`/api/post/${post._id}/like`).expect(200);
    expect((await author.agent.get('/api/notifications')).body.items).toHaveLength(0);
  });

  it('withdraws the notification when a follow is removed', async () => {
    const target = await createUser();
    const follower = await createUser();

    await follower.agent.put(`/api/user/${target.id}/follow`).expect(200);
    expect((await target.agent.get('/api/notifications')).body.items).toHaveLength(1);

    await follower.agent.put(`/api/user/${target.id}/unfollow`).expect(200);
    expect((await target.agent.get('/api/notifications')).body.items).toHaveLength(0);
  });

  it('keeps every comment as its own notification', async () => {
    const author = await createUser();
    const commenter = await createUser();
    const post = await createPost(author.agent);

    // Unlike likes, comments are not collapsed — three comments are three
    // distinct events worth surfacing.
    for (const content of ['One', 'Two', 'Three']) {
      await commenter.agent.post(`/api/post/${post._id}/comment`).send({ content }).expect(201);
    }

    const res = await author.agent.get('/api/notifications').expect(200);
    expect(res.body.items).toHaveLength(3);
  });
});

describe('notification reads', () => {
  it('reports and decrements the unread count', async () => {
    const author = await createUser();
    const liker = await createUser();
    const post = await createPost(author.agent);
    await liker.agent.put(`/api/post/${post._id}/like`).expect(200);

    let count = await author.agent.get('/api/notifications/unread-count').expect(200);
    expect(count.body.data.unread).toBe(1);

    const list = await author.agent.get('/api/notifications').expect(200);
    await author.agent.patch(`/api/notifications/${list.body.items[0]._id}/read`).expect(200);

    count = await author.agent.get('/api/notifications/unread-count').expect(200);
    expect(count.body.data.unread).toBe(0);
  });

  it('marks everything read at once', async () => {
    const author = await createUser();
    const commenter = await createUser();
    const post = await createPost(author.agent);
    for (const content of ['a', 'b', 'c']) {
      await commenter.agent.post(`/api/post/${post._id}/comment`).send({ content }).expect(201);
    }

    const res = await author.agent.patch('/api/notifications/read-all').expect(200);
    expect(res.body.data.modified).toBe(3);
    expect((await author.agent.get('/api/notifications/unread-count')).body.data.unread).toBe(0);
  });

  it('filters to unread only', async () => {
    const author = await createUser();
    const commenter = await createUser();
    const post = await createPost(author.agent);
    await commenter.agent.post(`/api/post/${post._id}/comment`).send({ content: 'one' }).expect(201);
    await commenter.agent.post(`/api/post/${post._id}/comment`).send({ content: 'two' }).expect(201);

    const list = await author.agent.get('/api/notifications').expect(200);
    await author.agent.patch(`/api/notifications/${list.body.items[0]._id}/read`).expect(200);

    const unread = await author.agent.get('/api/notifications?unreadOnly=true').expect(200);
    expect(unread.body.items).toHaveLength(1);
  });

  it('scopes the list to the recipient', async () => {
    const author = await createUser();
    const other = await createUser();
    const liker = await createUser();
    const post = await createPost(author.agent);
    await liker.agent.put(`/api/post/${post._id}/like`).expect(200);

    expect((await other.agent.get('/api/notifications')).body.items).toHaveLength(0);
    expect(await Notification.countDocuments()).toBe(1);
  });

  it('paginates', async () => {
    const author = await createUser();
    const commenter = await createUser();
    const post = await createPost(author.agent);
    for (let i = 0; i < 5; i += 1) {
      await commenter.agent.post(`/api/post/${post._id}/comment`).send({ content: `c${i}` }).expect(201);
    }

    const res = await author.agent.get('/api/notifications?page=1&limit=2').expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.unread).toBe(5);
  });
});

describe('notification failures are non-fatal', () => {
  it('still likes the post if notification bookkeeping fails', async () => {
    const author = await createUser();
    const liker = await createUser();
    const post = await createPost(author.agent);

    // notify() swallows its own errors by design: a notification is a side
    // effect, and must never turn a successful like into a 500.
    const original = Notification.findOneAndUpdate;
    Notification.findOneAndUpdate = () => {
      throw new Error('simulated notification failure');
    };
    try {
      const res = await liker.agent.put(`/api/post/${post._id}/like`).expect(200);
      expect(res.body.data.liked).toBe(true);
    } finally {
      Notification.findOneAndUpdate = original;
    }
  });
});
