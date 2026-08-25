import mongoose from 'mongoose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import Message from '../src/models/message.model.js';

/**
 * The DM thread query, checked through the query planner rather than the clock.
 *
 * Timing a query on a small fixture proves nothing — an in-memory sort over a
 * few hundred documents is fast. What actually matters is the shape of the
 * plan: whether the sort is served by an index, and whether the number of
 * documents examined tracks the page size or the length of the conversation.
 * Both are invisible from the response, which is why this regressed unnoticed.
 */

const A = new mongoose.Types.ObjectId();
const B = new mongoose.Types.ObjectId();
const C = new mongoose.Types.ObjectId();
const PAGE = 20;
const THREAD = 400;

/** The exact filter used by getMessages. */
const threadFilter = (me, them) => ({
  $or: [
    { senderId: me, receiverId: them },
    { senderId: them, receiverId: me },
  ],
});

const stagesOf = (winningPlan) => {
  const found = [];
  const walk = (stage) => {
    if (!stage) return;
    found.push(stage.stage);
    walk(stage.inputStage);
    (stage.inputStages ?? []).forEach(walk);
  };
  walk(winningPlan);
  return found;
};

const explainThread = (me, them) =>
  Message.find(threadFilter(me, them))
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE)
    .explain('executionStats');

beforeAll(async () => {
  // The declared indexes are only built on demand in tests. Building them once
  // is enough: the shared afterEach deletes documents but leaves indexes.
  await Message.init();
});

// Seeded per test, not once: the shared afterEach wipes every collection
// between tests, so a beforeAll fixture exists only for whichever test runs
// first.
beforeEach(async () => {
  const docs = [];
  for (let i = 0; i < THREAD; i += 1) {
    const outbound = i % 2 === 0;
    docs.push({
      senderId: outbound ? A : B,
      receiverId: outbound ? B : A,
      message: `message ${i}`,
    });
  }
  // A third party's traffic, so the plan cannot look good simply because the
  // collection holds nothing but this one conversation.
  for (let i = 0; i < 100; i += 1) {
    docs.push({ senderId: A, receiverId: C, message: `unrelated ${i}` });
  }
  await Message.insertMany(docs);
});

describe('DM thread query plan', () => {
  it('sorts from an index rather than in memory', async () => {
    const plan = await explainThread(A, B);
    const stages = stagesOf(plan.queryPlanner.winningPlan);

    // A blocking SORT is capped at 32MB, past which the query fails outright
    // rather than merely slowing down.
    expect(stages).not.toContain('SORT');
    expect(stages).toContain('SORT_MERGE');
  });

  it('examines a page worth of documents, not the whole conversation', async () => {
    const plan = await explainThread(A, B);

    expect(plan.executionStats.nReturned).toBe(PAGE);
    // Before the compound indexes this was THREAD (400) to return 20, so the
    // cost of opening a chat grew with how much the two people had ever said.
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(PAGE);
  });

  it('orders a thread identically whichever way round the ids are given', async () => {
    // insertMany stamps many of these with the same millisecond, so without a
    // tiebreak the two branches of the $or were free to order the ties
    // differently — and under skip-based paging that drops or repeats rows.
    const sort = { createdAt: -1, _id: -1 };
    const forward = await Message.find(threadFilter(A, B)).sort(sort).limit(PAGE).lean();
    const reverse = await Message.find(threadFilter(B, A)).sort(sort).limit(PAGE).lean();

    expect(forward.map((m) => String(m._id))).toEqual(reverse.map((m) => String(m._id)));
    expect(forward).toHaveLength(PAGE);
  });

  it('declares an index for each direction', async () => {
    const names = (await Message.collection.indexes()).map((i) => i.name);

    expect(names).toContain('senderId_1_receiverId_1_createdAt_-1__id_-1');
    expect(names).toContain('receiverId_1_senderId_1_createdAt_-1__id_-1');
  });
});
