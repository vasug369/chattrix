import { createServer } from 'http';

import { io as connectClient } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import {
  PRESENCE_OFFLINE,
  PRESENCE_ONLINE,
  PRESENCE_SYNC,
  initSocket,
  resetSocketState,
} from '../src/realtime/socket.js';
import { createUser } from './helpers.js';

/**
 * Presence over a real socket, rather than by calling the handler directly.
 *
 * The shape being pinned down here is a wire contract between two processes,
 * and the thing that went wrong in the version this replaces — a full list
 * broadcast to everyone on every connect — is invisible from inside a unit
 * test. It only shows up in what the *other* client receives.
 */

let server;
let url;

beforeAll(async () => {
  server = createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  resetSocketState();
  await new Promise((resolve) => server.close(resolve));
});

const open = [];

afterEach(() => {
  while (open.length) open.pop().disconnect();
});

/** Log in over HTTP and reduce Set-Cookie to a Cookie request header. */
const cookieFor = async ({ payload }) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: payload.email, password: payload.password })
    .expect(200);

  return res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
};

/** Connect a client and resolve once its presence snapshot has arrived. */
const connect = async (cookie) => {
  const client = connectClient(url, {
    extraHeaders: { Cookie: cookie },
    transports: ['websocket'],
    forceNew: true,
  });
  open.push(client);

  const snapshot = await once(client, PRESENCE_SYNC);
  return { client, snapshot };
};

const once = (client, event, ms = 4000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      ms
    );
    client.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

/** Collect every occurrence of `event` until stopped. */
const record = (client, event) => {
  const seen = [];
  client.on(event, (payload) => seen.push(payload));
  return seen;
};

/** Give the server a beat to emit anything it was going to emit. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 250));

describe('presence', () => {
  it('sends the arriving socket a snapshot that includes itself', async () => {
    const alice = await createUser();
    const { snapshot } = await connect(await cookieFor(alice));

    expect(snapshot).toContain(alice.id);
  });

  it('tells existing clients about a new arrival with an id, not a list', async () => {
    const alice = await createUser();
    const bob = await createUser();

    const { client: aliceClient } = await connect(await cookieFor(alice));
    const arrival = once(aliceClient, PRESENCE_ONLINE);

    await connect(await cookieFor(bob));

    // The whole point of the change: what the other client receives is one id.
    // The previous implementation sent the entire online list here, to every
    // connected socket, on every connect — which is what made the cost of a
    // single connection scale with the number of people already online.
    const payload = await arrival;
    expect(payload).toBe(bob.id);
    expect(Array.isArray(payload)).toBe(false);
  });

  it('stays silent when an already-online user opens another tab', async () => {
    const alice = await createUser();
    const bob = await createUser();

    const { client: aliceClient } = await connect(await cookieFor(alice));
    const bobCookie = await cookieFor(bob);

    await connect(bobCookie);
    await settle();

    // Only tabs opened after this point should be able to produce an event.
    const arrivals = record(aliceClient, PRESENCE_ONLINE);
    await connect(bobCookie);
    await settle();

    expect(arrivals).toEqual([]);
  });

  it('reports a user offline only once their last tab closes', async () => {
    const alice = await createUser();
    const bob = await createUser();

    const { client: aliceClient } = await connect(await cookieFor(alice));
    const bobCookie = await cookieFor(bob);

    const { client: firstTab } = await connect(bobCookie);
    const { client: secondTab } = await connect(bobCookie);
    await settle();

    const departures = record(aliceClient, PRESENCE_OFFLINE);

    firstTab.disconnect();
    await settle();
    expect(departures).toEqual([]);

    secondTab.disconnect();
    await settle();
    expect(departures).toEqual([bob.id]);
  });

  it('does not announce a user to themselves on connect', async () => {
    const alice = await createUser();
    const cookie = await cookieFor(alice);

    const { client } = await connect(cookie);
    const selfAnnouncements = record(client, PRESENCE_ONLINE);
    await settle();

    // Alice learns she is online from the snapshot, not from a delta about
    // herself — otherwise a second tab would announce its own user to the tab
    // that is already showing them as online.
    expect(selfAnnouncements).toEqual([]);
  });
});
