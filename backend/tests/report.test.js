import { describe, expect, it } from 'vitest';
import Message from '../src/models/message.model.js';
import Report from '../src/models/report.model.js';
import User from '../src/models/user.model.js';
import { anonAgent, createPost, createUser } from './helpers.js';

const report = (agent, body) => agent.post('/api/reports').send({ reason: 'spam', ...body });

describe('filing a report', () => {
  it('requires a session', async () => {
    await anonAgent().post('/api/reports').send({ targetType: 'user', targetId: '507f1f77bcf86cd799439011', reason: 'spam' }).expect(401);
  });

  it('validates the payload', async () => {
    const { agent } = await createUser();
    const other = await createUser();
    await report(agent, { targetType: 'user', targetId: other.id, reason: 'boring' }).expect(422);
    await report(agent, { targetType: 'comment', targetId: other.id }).expect(422);
    await report(agent, { targetType: 'user', targetId: other.id, extra: 1 }).expect(422);
  });

  it('reports a post, keeping a snapshot, once per person', async () => {
    const author = await createUser();
    const reporter = await createUser();
    const post = await createPost(author.agent, { title: 'Buy followers', content: 'cheap cheap cheap' });

    const res = await report(reporter.agent, { targetType: 'post', targetId: post._id, details: 'obvious spam' }).expect(201);
    expect(res.body.data.status).toBe('open');

    const saved = await Report.findById(res.body.data._id);
    expect(String(saved.targetUser)).toBe(author.id);
    expect(saved.snapshot).toContain('cheap cheap cheap');

    await report(reporter.agent, { targetType: 'post', targetId: post._id }).expect(409);
  });

  it('refuses your own content and missing items', async () => {
    const me = await createUser();
    const post = await createPost(me.agent);
    await report(me.agent, { targetType: 'post', targetId: post._id }).expect(400);
    await report(me.agent, { targetType: 'user', targetId: me.id }).expect(400);
    await report(me.agent, { targetType: 'post', targetId: '507f1f77bcf86cd799439011' }).expect(404);
  });

  it('reports a comment through its post', async () => {
    const author = await createUser();
    const commenter = await createUser();
    const reporter = await createUser();
    const post = await createPost(author.agent);
    const res = await commenter.agent.post(`/api/post/${post._id}/comment`).send({ content: 'rude comment' }).expect(201);
    const comment = res.body.data.comments.at(-1);

    const r = await report(reporter.agent, { targetType: 'comment', targetId: comment._id, postId: post._id, reason: 'harassment' }).expect(201);
    const saved = await Report.findById(r.body.data._id);
    expect(String(saved.targetUser)).toBe(commenter.id);
    expect(saved.snapshot).toBe('rude comment');
  });

  it('lets only the recipient report a message', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    const stranger = await createUser();
    await sender.agent.post(`/api/messages/send/${receiver.id}`).send({ message: 'nasty' }).expect(201);
    const msg = await Message.findOne();

    await report(stranger.agent, { targetType: 'message', targetId: msg._id.toString() }).expect(404);
    await report(sender.agent, { targetType: 'message', targetId: msg._id.toString() }).expect(404);
    await report(receiver.agent, { targetType: 'message', targetId: msg._id.toString(), reason: 'harassment' }).expect(201);
  });

  it('can block in the same step', async () => {
    const bad = await createUser();
    const reporter = await createUser();
    await report(reporter.agent, { targetType: 'user', targetId: bad.id, alsoBlock: true }).expect(201);
    const me = await User.findById(reporter.id).select('+blocked');
    expect(me.blocked.map(String)).toEqual([bad.id]);
  });

  it('respects blocks: the blocked person can’t report the blocker, the blocker can report them', async () => {
    const blocker = await createUser();
    const blocked = await createUser();
    await blocker.agent.put(`/api/user/${blocked.id}/block`).expect(200);
    await report(blocked.agent, { targetType: 'user', targetId: blocker.id }).expect(404);
    await report(blocker.agent, { targetType: 'user', targetId: blocked.id }).expect(201);
  });

  it('is open to unverified accounts', async () => {
    const reporter = await createUser({ verified: false });
    const other = await createUser();
    await report(reporter.agent, { targetType: 'user', targetId: other.id }).expect(201);
  });
});
