import { describe, expect, it, vi } from 'vitest';
import { sendMail, queueMail, describeMailSetup, mailProvider } from '../src/config/mailer.js';

/**
 * Mail is a side effect of the request that triggered it. These lock in the
 * two properties the rest of the app depends on: sending never throws, and
 * handing mail off never makes the caller wait for the provider.
 */

describe('sendMail', () => {
  it('never throws, whatever the provider does', async () => {
    // Registration must succeed even when mail cannot be sent. Previously a
    // dead provider added its full timeout to the request instead.
    await expect(
      sendMail({ to: 'someone@example.com', subject: 'x', text: 'y' })
    ).resolves.toBeTypeOf('boolean');
  });

  it('reports failure rather than raising it', async () => {
    // Under test no provider is configured, so this is the disabled path.
    const ok = await sendMail({ to: 'a@b.c', subject: 's', text: 't' });
    expect(ok).toBe(false);
  });

  it('tolerates a missing body', async () => {
    await expect(sendMail({ to: 'a@b.c', subject: 's' })).resolves.toBe(false);
  });
});

describe('queueMail', () => {
  it('returns synchronously without awaiting the provider', () => {
    // The point of the helper: the caller is not handed the provider's latency.
    const started = Date.now();
    const result = queueMail({ to: 'a@b.c', subject: 's', text: 't' });
    expect(result).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(50);
  });

  it('swallows provider failures instead of producing an unhandled rejection', async () => {
    const onRejection = vi.fn();
    process.once('unhandledRejection', onRejection);

    queueMail({ to: 'a@b.c', subject: 's', text: 't' });
    // Give the microtask queue a chance to surface anything that escaped.
    await new Promise((r) => setTimeout(r, 30));

    expect(onRejection).not.toHaveBeenCalled();
    process.off('unhandledRejection', onRejection);
  });
});

describe('describeMailSetup', () => {
  it('says plainly when mail is disabled', () => {
    expect(mailProvider).toBe('disabled');
    expect(describeMailSetup()).toMatch(/disabled/i);
  });

  it('names the reason so a deploy log answers "why is no mail arriving"', () => {
    expect(describeMailSetup()).toMatch(/RESEND_API_KEY|SMTP/);
  });
});
