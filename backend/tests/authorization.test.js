import { describe, expect, it } from 'vitest';
import Post from '../src/models/post.model.js';
import User from '../src/models/user.model.js';
import { createPost, createUser } from './helpers.js';

/**
 * Broken-access-control regressions.
 *
 * Every test here corresponds to something the API previously allowed. They are
 * the reason this refactor happened, so they are kept together rather than
 * scattered through the per-resource suites.
 */
describe('post ownership', () => {
  it("refuses to let a user edit someone else's post", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const post = await createPost(owner.agent, { title: 'Original title' });

    // updatePostService took only an id, so knowing a post id was enough to
    // rewrite it.
    await attacker.agent
      .put(`/api/post/update/${post._id}`)
      .send({ title: 'Defaced by attacker' })
      .expect(403);

    const unchanged = await Post.findById(post._id);
    expect(unchanged.title).toBe('Original title');
  });

  it("refuses to let a user delete someone else's post", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const post = await createPost(owner.agent);

    await attacker.agent.delete(`/api/post/${post._id}`).expect(403);
    expect(await Post.findById(post._id)).not.toBeNull();
  });

  it('lets the owner edit and delete their own post', async () => {
    const owner = await createUser();
    const post = await createPost(owner.agent);

    const updated = await owner.agent
      .put(`/api/post/update/${post._id}`)
      .send({ title: 'An updated title' })
      .expect(200);
    expect(updated.body.data.title).toBe('An updated title');

    await owner.agent.delete(`/api/post/${post._id}`).expect(200);
    expect(await Post.findById(post._id)).toBeNull();
  });

  it('cannot forge the author field when creating a post', async () => {
    const author = await createUser();
    const victim = await createUser();

    const res = await author.agent
      .post('/api/post/create')
      .send({ title: 'Impersonation attempt', content: 'x', author: victim.id })
      .expect(201);

    expect(res.body.data.author._id).toBe(author.id);
  });
});

describe('profile ownership', () => {
  it("cannot update another user's profile", async () => {
    const victim = await createUser({ name: 'Victim' });
    const attacker = await createUser();

    // `PUT /api/user/:id` took the target from the URL and passed req.body
    // straight to findByIdAndUpdate. That route is gone; PATCH /me is scoped
    // to the session user.
    await attacker.agent.put(`/api/user/${victim.id}`).send({ name: 'Owned' }).expect(404);

    const unchanged = await User.findById(victim.id);
    expect(unchanged.name).toBe('Victim');
  });

  it('only updates the session user via PATCH /api/user/me', async () => {
    const victim = await createUser({ name: 'Victim' });
    const attacker = await createUser({ name: 'Attacker' });

    await attacker.agent.patch('/api/user/me').send({ name: 'Renamed' }).expect(200);

    expect((await User.findById(attacker.id)).name).toBe('Renamed');
    expect((await User.findById(victim.id)).name).toBe('Victim');
  });

  it('rejects attempts to escalate privileges through the profile update', async () => {
    const { agent, id } = await createUser();

    // Mass assignment: password, isAccountVerified and followers were all
    // writable through this endpoint.
    const res = await agent
      .patch('/api/user/me')
      .send({ name: 'Fine', password: 'hacked', isAccountVerified: true, followers: [] })
      .expect(422);

    expect(res.body.message).toBe('Validation failed');
    const user = await User.findById(id).select('+password');
    expect(user.password).not.toBe('hacked');
  });
});

describe('user data exposure', () => {
  it('never returns password hashes from the user list', async () => {
    const { agent } = await createUser();
    await createUser();

    const res = await agent.get('/api/user/getAllUsers').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const user of res.body.items) {
      // `User.find({})` with no projection previously handed every caller
      // every user's bcrypt hash and OTP fields.
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('verifyOtp');
      expect(user).not.toHaveProperty('resetOtp');
      expect(user).not.toHaveProperty('email');
    }
  });

  it('never returns secrets from a single-user fetch', async () => {
    const viewer = await createUser();
    const target = await createUser();

    const res = await viewer.agent.get(`/api/user/${target.id}`).expect(200);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data).not.toHaveProperty('verifyOtp');
    expect(res.body.data).not.toHaveProperty('resetOtp');
  });

  it('never returns secrets from the profile endpoint', async () => {
    const viewer = await createUser();
    const target = await createUser();

    const res = await viewer.agent.get(`/api/myProfile/${target.id}`).expect(200);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data).not.toHaveProperty('verifyOtp');
  });

  it('never leaks secrets through the messages sidebar', async () => {
    const { agent } = await createUser();
    await createUser();

    const res = await agent.get('/api/messages/users').expect(200);
    for (const user of res.body.items) {
      expect(user).not.toHaveProperty('password');
    }
  });
});

describe('notification ownership', () => {
  it("cannot mark another user's notification as read", async () => {
    const author = await createUser();
    const liker = await createUser();
    const attacker = await createUser();

    const post = await createPost(author.agent);
    await liker.agent.put(`/api/post/${post._id}/like`).expect(200);

    const list = await author.agent.get('/api/notifications').expect(200);
    const notificationId = list.body.items[0]._id;

    // The update is scoped to `recipient`, so a guessed id finds nothing.
    await attacker.agent.patch(`/api/notifications/${notificationId}/read`).expect(404);

    const still = await author.agent.get('/api/notifications').expect(200);
    expect(still.body.items[0].readAt).toBeNull();
  });
});
