import { describe, expect, it } from 'vitest';
import Post from '../src/models/post.model.js';
import { createPost, createUser } from './helpers.js';

describe('post CRUD', () => {
  it('creates a post attributed to the session user', async () => {
    const { agent, id } = await createUser({ name: 'Author Name' });
    const post = await createPost(agent, { title: 'My first post' });

    expect(post.title).toBe('My first post');
    expect(post.author._id).toBe(id);
    expect(post.author.name).toBe('Author Name');
  });

  it('returns an empty list rather than an error when there are no posts', async () => {
    const { agent } = await createUser();
    const res = await agent.get('/api/post').expect(200);
    // getAllPosts used to `throw new Error('No posts found')` on an empty
    // collection, so a brand-new install answered 500.
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('paginates, newest first', async () => {
    const { agent } = await createUser();
    for (let i = 1; i <= 5; i += 1) {
      await createPost(agent, { title: `Post number ${i}` });
    }

    const page1 = await agent.get('/api/post?page=1&limit=2').expect(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.pagination).toMatchObject({ page: 1, limit: 2, total: 5, pages: 3 });
    expect(page1.body.items[0].title).toBe('Post number 5');

    const page3 = await agent.get('/api/post?page=3&limit=2').expect(200);
    expect(page3.body.items).toHaveLength(1);
  });

  it('404s for a well-formed but unknown post id', async () => {
    const { agent } = await createUser();
    await agent.get('/api/post/507f1f77bcf86cd799439011').expect(404);
  });
});

describe('feed', () => {
  it('returns a flat, chronological list of posts from followed users', async () => {
    const reader = await createUser();
    const alice = await createUser({ name: 'Alice' });
    const bob = await createUser({ name: 'Bob' });

    await createPost(alice.agent, { title: 'Alice post one' });
    await createPost(bob.agent, { title: 'Bob post one' });
    await createPost(alice.agent, { title: 'Alice post two' });

    await reader.agent.put(`/api/user/${alice.id}/follow`).expect(200);
    await reader.agent.put(`/api/user/${bob.id}/follow`).expect(200);

    const res = await reader.agent.get('/api/post/feed').expect(200);

    // The old implementation pushed each followed user's result *array* into
    // an accumulator, so this was [[...alice], [...bob]] in follow order
    // rather than one merged, time-ordered feed.
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.every((p) => !Array.isArray(p))).toBe(true);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items[0].title).toBe('Alice post two');
  });

  it("excludes posts from users the reader doesn't follow", async () => {
    const reader = await createUser();
    const stranger = await createUser();
    await createPost(stranger.agent, { title: 'Stranger post' });

    const res = await reader.agent.get('/api/post/feed').expect(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("includes the reader's own posts", async () => {
    const reader = await createUser();
    await createPost(reader.agent, { title: 'My own post' });

    const res = await reader.agent.get('/api/post/feed').expect(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('drops posts from a user after unfollowing them', async () => {
    const reader = await createUser();
    const author = await createUser();
    await createPost(author.agent, { title: 'Some post here' });

    await reader.agent.put(`/api/user/${author.id}/follow`).expect(200);
    expect((await reader.agent.get('/api/post/feed')).body.items).toHaveLength(1);

    await reader.agent.put(`/api/user/${author.id}/unfollow`).expect(200);
    expect((await reader.agent.get('/api/post/feed')).body.items).toHaveLength(0);
  });
});

describe('likes', () => {
  it('toggles a like on and off', async () => {
    const author = await createUser();
    const liker = await createUser();
    const post = await createPost(author.agent);

    const liked = await liker.agent.put(`/api/post/${post._id}/like`).expect(200);
    expect(liked.body.data).toMatchObject({ liked: true, likeCount: 1 });

    const unliked = await liker.agent.put(`/api/post/${post._id}/like`).expect(200);
    expect(unliked.body.data).toMatchObject({ liked: false, likeCount: 0 });
  });

  it('counts each user once no matter how often they click', async () => {
    const author = await createUser();
    const a = await createUser();
    const b = await createUser();
    const post = await createPost(author.agent);

    await a.agent.put(`/api/post/${post._id}/like`).expect(200);
    await b.agent.put(`/api/post/${post._id}/like`).expect(200);
    await a.agent.put(`/api/post/${post._id}/like`).expect(200); // a unlikes

    const fresh = await Post.findById(post._id);
    expect(fresh.likes).toHaveLength(1);
  });
});

describe('comments', () => {
  it('adds a comment carrying the commenter name', async () => {
    const author = await createUser();
    const commenter = await createUser({ name: 'Commenter Name' });
    const post = await createPost(author.agent);

    const res = await commenter.agent
      .post(`/api/post/${post._id}/comment`)
      .send({ content: 'Nice post!' })
      .expect(201);

    const comments = res.body.data.comments;
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({ content: 'Nice post!', name: 'Commenter Name' });
  });

  it('gives each comment its own timestamp', async () => {
    const { agent } = await createUser();
    const post = await createPost(agent);

    await agent.post(`/api/post/${post._id}/comment`).send({ content: 'First' }).expect(201);
    await new Promise((r) => setTimeout(r, 10));
    await agent.post(`/api/post/${post._id}/comment`).send({ content: 'Second' }).expect(201);

    const fresh = await Post.findById(post._id);
    // `createdAt: { default: Date.now() }` — note the call — froze the default
    // at module load, so every comment shared one timestamp.
    const [first, second] = fresh.comments;
    expect(second.createdAt.getTime()).toBeGreaterThan(first.createdAt.getTime());
  });

  it('404s when commenting on a post that does not exist', async () => {
    const { agent } = await createUser();
    await agent
      .post('/api/post/507f1f77bcf86cd799439011/comment')
      .send({ content: 'Hello' })
      .expect(404);
  });
});

describe('follow', () => {
  it('is idempotent', async () => {
    const follower = await createUser();
    const target = await createUser();

    await follower.agent.put(`/api/user/${target.id}/follow`).expect(200);
    await follower.agent.put(`/api/user/${target.id}/follow`).expect(200);

    const profile = await follower.agent.get(`/api/user/${target.id}`).expect(200);
    // $addToSet: a double-click cannot push the same id twice.
    expect(profile.body.data.followerCount).toBe(1);
  });

  it('refuses self-follow', async () => {
    const { agent, id } = await createUser();
    await agent.put(`/api/user/${id}/follow`).expect(400);
  });

  it('reports follow state via is-following', async () => {
    const follower = await createUser();
    const target = await createUser();

    let res = await follower.agent.get(`/api/user/is-following/${target.id}`).expect(200);
    expect(res.body.data.isFollowing).toBe(false);

    await follower.agent.put(`/api/user/${target.id}/follow`).expect(200);
    res = await follower.agent.get(`/api/user/is-following/${target.id}`).expect(200);
    expect(res.body.data.isFollowing).toBe(true);
  });

  it('exposes isFollowing on a profile view', async () => {
    const viewer = await createUser();
    const target = await createUser();
    await viewer.agent.put(`/api/user/${target.id}/follow`).expect(200);

    const res = await viewer.agent.get(`/api/user/${target.id}`).expect(200);
    expect(res.body.data.isFollowing).toBe(true);
    expect(res.body.data.isSelf).toBe(false);
  });
});

describe('account deletion', () => {
  it("removes the user's posts and follow references", async () => {
    const user = await createUser();
    const follower = await createUser();
    await createPost(user.agent, { title: 'Doomed post' });
    await follower.agent.put(`/api/user/${user.id}/follow`).expect(200);

    await user.agent.delete('/api/user/me').expect(200);

    // Deleting only the User document left orphaned posts and dangling
    // follower ids that rendered as "Unknown" throughout the UI.
    expect(await Post.countDocuments({ author: user.id })).toBe(0);
    const followerDoc = await follower.agent.get('/api/user/me').expect(200);
    expect(followerDoc.body.data.followingCount).toBe(0);
  });
});
