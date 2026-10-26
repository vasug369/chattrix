import { describe, expect, it } from 'vitest';
import AdminAction from '../src/models/adminAction.model.js';
import Message from '../src/models/message.model.js';
import Post from '../src/models/post.model.js';
import Report from '../src/models/report.model.js';
import User from '../src/models/user.model.js';
import { VALID_PASSWORD, anonAgent, app, createPost, createUser, request } from './helpers.js';

const makeAdmin = async (u) => User.updateOne({ _id: u.id }, { $set: { role: 'admin' } });

/** An admin, an author with a post, and two people who reported it. */
const setup = async () => {
  const admin = await createUser({ name: 'Admin Person' });
  await makeAdmin(admin);
  const author = await createUser({ name: 'Author Person' });
  const post = await createPost(author.agent, { title: 'Spammy post', content: 'buy now' });
  const r1 = await createUser();
  const r2 = await createUser();
  const first = await r1.agent.post('/api/reports').send({ targetType: 'post', targetId: post._id, reason: 'spam' }).expect(201);
  await r2.agent.post('/api/reports').send({ targetType: 'post', targetId: post._id, reason: 'hate' }).expect(201);
  return { admin, author, post, reportId: first.body.data._id };
};

describe('admin access', () => {
  it('is 401 without a session and 403 for non-admins', async () => {
    const { agent } = await createUser();
    await anonAgent().get('/api/admin/reports').expect(401);
    await agent.get('/api/admin/reports').expect(403);
    await agent.get('/api/admin/users').expect(403);
    await agent.get('/api/admin/audit').expect(403);
  });

  it('exposes the role on /user/me', async () => {
    const { admin } = await setup();
    const me = await admin.agent.get('/api/user/me').expect(200);
    expect(me.body.data.role).toBe('admin');
  });
});

describe('reports queue', () => {
  it('groups reports of the same item into one row with a count', async () => {
    const { admin, post } = await setup();
    const res = await admin.agent.get('/api/admin/reports').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].targetId).toBe(post._id);
    expect(res.body.items[0].count).toBe(2);
    expect(res.body.items[0].reasons.sort()).toEqual(['hate', 'spam']);
    expect(res.body.items[0].targetUser.name).toBe('Author Person');
  });

  it('shows a report with every report on the item and the author’s history', async () => {
    const { admin, reportId } = await setup();
    const res = await admin.agent.get(`/api/admin/reports/${reportId}`).expect(200);
    expect(res.body.data.reports).toHaveLength(2);
    expect(res.body.data.contentExists).toBe(true);
    expect(res.body.data.reportsAgainst90d).toBe(2);
    expect(res.body.data.targetUser.name).toBe('Author Person');
  });

  it('validates the resolve body', async () => {
    const { admin, reportId } = await setup();
    await admin.agent.post(`/api/admin/reports/${reportId}/resolve`).send({ action: 'nuke', note: 'x' }).expect(422);
  });
});

describe('resolving reports', () => {
  it('removes the content, closes every report on it, and audits', async () => {
    const { admin, post, reportId } = await setup();
    const res = await admin.agent.post(`/api/admin/reports/${reportId}/resolve`).send({ action: 'remove', note: 'Spam' }).expect(200);
    expect(res.body.data.reportsClosed).toBe(2);

    expect(await Post.exists({ _id: post._id })).toBeNull();
    expect(await Report.countDocuments({ status: 'resolved', resolution: 'removed' })).toBe(2);
    const log = await AdminAction.findOne({ action: 'report.removed' });
    expect(log.note).toBe('Spam');

    await admin.agent.post(`/api/admin/reports/${reportId}/resolve`).send({ action: 'remove', note: 'again' }).expect(400);
  });

  it('dismisses without touching the content', async () => {
    const { admin, post, reportId } = await setup();
    await admin.agent.post(`/api/admin/reports/${reportId}/resolve`).send({ action: 'dismiss', note: 'Not a violation' }).expect(200);
    expect(await Post.exists({ _id: post._id })).not.toBeNull();
    expect(await Report.countDocuments({ status: 'dismissed' })).toBe(2);
  });

  it('removes a reported message', async () => {
    const admin = await createUser();
    await makeAdmin(admin);
    const sender = await createUser();
    const receiver = await createUser();
    await sender.agent.post(`/api/messages/send/${receiver.id}`).send({ message: 'abuse' }).expect(201);
    const msg = await Message.findOne();
    const r = await receiver.agent.post('/api/reports').send({ targetType: 'message', targetId: msg._id.toString(), reason: 'harassment' }).expect(201);

    await admin.agent.post(`/api/admin/reports/${r.body.data._id}/resolve`).send({ action: 'remove', note: 'Harassment' }).expect(200);
    expect(await Message.exists({ _id: msg._id })).toBeNull();
  });

  it('won’t “remove” an account; that is what suspension is for', async () => {
    const admin = await createUser();
    await makeAdmin(admin);
    const target = await createUser();
    const reporter = await createUser();
    const r = await reporter.agent.post('/api/reports').send({ targetType: 'user', targetId: target.id, reason: 'spam' }).expect(201);
    await admin.agent.post(`/api/admin/reports/${r.body.data._id}/resolve`).send({ action: 'remove', note: 'Spam' }).expect(400);
  });
});

describe('suspension', () => {
  it('signs the account out everywhere and refuses sign-in until lifted', async () => {
    const { admin, author } = await setup();

    await admin.agent.post(`/api/admin/users/${author.id}/suspend`).send({ days: 7, reason: 'Repeated spam' }).expect(200);

    // Existing session is dead.
    await author.agent.get('/api/user/me').expect(401);

    // New sign-in is refused with the reason.
    const login = await request(app).post('/api/auth/login').send({ email: author.payload.email, password: VALID_PASSWORD }).expect(403);
    expect(login.body.message).toMatch(/suspended until/i);
    expect(login.body.message).toMatch(/Repeated spam/);

    const list = await admin.agent.get('/api/admin/users?status=suspended').expect(200);
    expect(list.body.items.map((u) => u._id)).toEqual([author.id]);

    await admin.agent.post(`/api/admin/users/${author.id}/unsuspend`).expect(200);
    await request(app).post('/api/auth/login').send({ email: author.payload.email, password: VALID_PASSWORD }).expect(200);

    const audit = await admin.agent.get('/api/admin/audit').expect(200);
    expect(audit.body.items.map((a) => a.action)).toEqual(['user.unsuspended', 'user.suspended']);
  });

  it('supports permanent bans', async () => {
    const { admin, author } = await setup();
    await admin.agent.post(`/api/admin/users/${author.id}/suspend`).send({ days: null, reason: 'Hate speech' }).expect(200);
    const login = await request(app).post('/api/auth/login').send({ email: author.payload.email, password: VALID_PASSWORD }).expect(403);
    expect(login.body.message).toMatch(/permanently/i);
  });

  it('validates duration, and refuses self and other admins', async () => {
    const { admin, author } = await setup();
    await admin.agent.post(`/api/admin/users/${author.id}/suspend`).send({ days: 3, reason: 'x y z' }).expect(422);
    await admin.agent.post(`/api/admin/users/${admin.id}/suspend`).send({ days: 1, reason: 'test' }).expect(400);

    const other = await createUser();
    await makeAdmin(other);
    await admin.agent.post(`/api/admin/users/${other.id}/suspend`).send({ days: 1, reason: 'test' }).expect(403);
  });

  it('does not reveal a suspension to someone with the wrong password', async () => {
    const { admin, author } = await setup();
    await admin.agent.post(`/api/admin/users/${author.id}/suspend`).send({ days: 1, reason: 'Spam' }).expect(200);
    const res = await request(app).post('/api/auth/login').send({ email: author.payload.email, password: 'Wr0ngPassword' }).expect(401);
    expect(res.body.message).not.toMatch(/suspend/i);
  });
});
