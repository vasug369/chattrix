import { describe, expect, it } from 'vitest';
import Conversation from '../src/models/conversation.model.js';
import Message from '../src/models/message.model.js';
import { createUser } from './helpers.js';

describe('direct messages', () => {
  it('sends a message and creates the conversation once', async () => {
    const sender = await createUser();
    const receiver = await createUser();

    await sender.agent
      .post(`/api/messages/send/${receiver.id}`)
      .send({ message: 'First message' })
      .expect(201);
    await sender.agent
      .post(`/api/messages/send/${receiver.id}`)
      .send({ message: 'Second message' })
      .expect(201);

    expect(await Conversation.countDocuments()).toBe(1);
    expect(await Message.countDocuments()).toBe(2);
  });

  it('returns the thread oldest-first for both participants', async () => {
    const a = await createUser();
    const b = await createUser();

    await a.agent.post(`/api/messages/send/${b.id}`).send({ message: 'one' }).expect(201);
    await b.agent.post(`/api/messages/send/${a.id}`).send({ message: 'two' }).expect(201);
    await a.agent.post(`/api/messages/send/${b.id}`).send({ message: 'three' }).expect(201);

    const forA = await a.agent.get(`/api/messages/${b.id}`).expect(200);
    expect(forA.body.items.map((m) => m.message)).toEqual(['one', 'two', 'three']);

    const forB = await b.agent.get(`/api/messages/${a.id}`).expect(200);
    expect(forB.body.items).toHaveLength(3);
  });

  it('does not leak a conversation to a third party', async () => {
    const a = await createUser();
    const b = await createUser();
    const outsider = await createUser();

    await a.agent.post(`/api/messages/send/${b.id}`).send({ message: 'private' }).expect(201);

    // The query is scoped to the pair (me, them), so an outsider asking for
    // either participant's thread sees only their own (empty) history.
    const res = await outsider.agent.get(`/api/messages/${a.id}`).expect(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('404s when messaging a user that does not exist', async () => {
    const sender = await createUser();
    // Previously this created a dangling conversation with a nonexistent
    // participant that nobody could ever open.
    await sender.agent
      .post('/api/messages/send/507f1f77bcf86cd799439011')
      .send({ message: 'hello' })
      .expect(404);
    expect(await Conversation.countDocuments()).toBe(0);
  });

  it('refuses self-messaging', async () => {
    const { agent, id } = await createUser();
    await agent.post(`/api/messages/send/${id}`).send({ message: 'note to self' }).expect(400);
  });

  it('paginates long threads', async () => {
    const a = await createUser();
    const b = await createUser();
    for (let i = 0; i < 5; i += 1) {
      await a.agent.post(`/api/messages/send/${b.id}`).send({ message: `m${i}` }).expect(201);
    }

    const res = await a.agent.get(`/api/messages/${b.id}?page=1&limit=2`).expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination.total).toBe(5);
    // Page 1 is the newest slice, still rendered oldest-first within the page.
    expect(res.body.items.map((m) => m.message)).toEqual(['m3', 'm4']);
  });
});

describe('read receipts', () => {
  it('marks incoming messages read when the thread is opened', async () => {
    const sender = await createUser();
    const receiver = await createUser();

    await sender.agent.post(`/api/messages/send/${receiver.id}`).send({ message: 'unread' }).expect(201);

    expect(await Message.countDocuments({ readAt: null })).toBe(1);
    await receiver.agent.get(`/api/messages/${sender.id}`).expect(200);
    expect(await Message.countDocuments({ readAt: null })).toBe(0);
  });

  it("does not mark the sender's own messages read when they reopen the thread", async () => {
    const sender = await createUser();
    const receiver = await createUser();
    await sender.agent.post(`/api/messages/send/${receiver.id}`).send({ message: 'hi' }).expect(201);

    await sender.agent.get(`/api/messages/${receiver.id}`).expect(200);

    // Only the *other* side's messages get marked — otherwise a sender could
    // mark their own message as read by the recipient.
    expect(await Message.countDocuments({ readAt: null })).toBe(1);
  });
});

describe('conversation sidebar', () => {
  it('lists other users with per-conversation unread counts', async () => {
    const me = await createUser();
    const chatty = await createUser({ name: 'Chatty' });
    const quiet = await createUser({ name: 'Quiet' });

    await chatty.agent.post(`/api/messages/send/${me.id}`).send({ message: 'one' }).expect(201);
    await chatty.agent.post(`/api/messages/send/${me.id}`).send({ message: 'two' }).expect(201);

    const res = await me.agent.get('/api/messages/users').expect(200);
    const byName = Object.fromEntries(res.body.items.map((u) => [u.name, u]));

    expect(res.body.items.map((u) => u._id)).not.toContain(me.id);
    expect(byName.Chatty.unreadCount).toBe(2);
    expect(byName.Quiet.unreadCount).toBe(0);
  });

  it('clears the unread badge once the thread is opened', async () => {
    const me = await createUser();
    const them = await createUser({ name: 'Them' });
    await them.agent.post(`/api/messages/send/${me.id}`).send({ message: 'ping' }).expect(201);

    await me.agent.get(`/api/messages/${them.id}`).expect(200);

    const res = await me.agent.get('/api/messages/users').expect(200);
    expect(res.body.items.find((u) => u.name === 'Them').unreadCount).toBe(0);
  });
});
