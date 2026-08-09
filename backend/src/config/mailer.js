import nodemailer from 'nodemailer';
import env from './env.js';

/**
 * Outbound mail, with the provider chosen from whatever is configured.
 *
 * Priority: Resend HTTP API > SMTP > disabled (log only).
 *
 * The HTTP API is preferred over Resend's own SMTP endpoint on purpose. The
 * previous Mailtrap setup failed with an eight-second *connection* timeout
 * rather than an authentication error, which is the signature of the SMTP port
 * being filtered rather than of bad credentials — a common restriction on
 * managed hosts. An HTTPS call on 443 is not subject to that, so it removes a
 * whole class of "why is no mail arriving" from the deployment.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** Wall-clock ceiling for a single send, so a hung provider cannot pile up. */
const SEND_TIMEOUT_MS = 8000;

const providerName = () => {
    // An explicit choice always wins, so that having two credentials
    // configured cannot silently select the wrong one.
    if (env.MAIL_PROVIDER) return env.isTest ? 'disabled' : env.MAIL_PROVIDER;

    // All three flags are false under NODE_ENV=test, so a developer's real
    // credentials in .env can never make the suite send live mail.
    if (env.brevoEnabled) return 'brevo';
    if (env.resendEnabled) return 'resend';
    if (env.mailEnabled) return 'smtp';
    return 'disabled';
};

/**
 * Split "Name <address@host>" into Brevo's structured sender.
 *
 * Resend accepts the combined RFC-5322 form; Brevo requires name and email as
 * separate fields, so SENDER_EMAIL has to work in both shapes.
 */
export const parseSender = (value = '') => {
    const match = String(value).match(/^\s*(.*?)\s*<([^>]*)>\s*$/);
    // `[^>]*` is greedy and `\s*` can match empty, so the inner value has to be
    // trimmed explicitly — matching it inside the group silently kept trailing
    // spaces in the address and produced a sender the provider would reject.
    if (match) return { name: match[1] || undefined, email: match[2].trim() };
    return { email: String(value).trim() };
};

export const mailProvider = providerName();

const sendViaResend = async ({ to, subject, text, html }) => {
    // AbortSignal.timeout rather than a bare fetch: without it a stalled
    // connection would hold the request open indefinitely.
    const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: env.SENDER_EMAIL,
            to: [to],
            subject,
            ...(text ? { text } : {}),
            ...(html ? { html } : {}),
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
        // Resend returns a JSON body explaining the refusal. Surfacing it is
        // the difference between a diagnosable log line and "mail didn't work"
        // — the unverified-domain rejection in particular is easy to miss.
        let detail = '';
        try {
            const body = await res.json();
            detail = body?.message ?? JSON.stringify(body);
        } catch {
            detail = `HTTP ${res.status}`;
        }
        throw new Error(`Resend rejected the message: ${detail}`);
    }

    return true;
};

const sendViaBrevo = async ({ to, subject, text, html }) => {
    const res = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
            'api-key': env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            accept: 'application/json',
        },
        body: JSON.stringify({
            sender: parseSender(env.SENDER_EMAIL),
            to: [{ email: to }],
            subject,
            ...(text ? { textContent: text } : {}),
            ...(html ? { htmlContent: html } : {}),
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
        let detail = '';
        try {
            const body = await res.json();
            detail = body?.message ?? JSON.stringify(body);
        } catch {
            detail = `HTTP ${res.status}`;
        }
        // The most likely refusal on a new free account is
        // "Your SMTP account is not yet activated" — Brevo gates transactional
        // sending behind a manual review. Surfacing the text verbatim is what
        // makes that diagnosable rather than just "mail didn't work".
        throw new Error(`Brevo rejected the message: ${detail}`);
    }

    return true;
};

const buildSmtpTransporter = () =>
    nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        // Without these, an unreachable host hangs the socket indefinitely and
        // the caller blocks for minutes instead of degrading.
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
    });

let smtpTransporter = null;
const smtp = () => (smtpTransporter ??= buildSmtpTransporter());

/**
 * Send a message. Never throws.
 *
 * Mail is a side effect of the request that triggered it: a registration must
 * still succeed when the mail provider is down. Same reasoning as notify().
 *
 * @returns {Promise<boolean>} whether the message was handed off successfully
 */
export const sendMail = async ({ to, subject, text, html }) => {
    try {
        if (mailProvider === 'resend') {
            await sendViaResend({ to, subject, text, html });
            return true;
        }

        if (mailProvider === 'brevo') {
            await sendViaBrevo({ to, subject, text, html });
            return true;
        }

        if (mailProvider === 'smtp') {
            await smtp().sendMail({ from: env.SENDER_EMAIL, to, subject, text, html });
            return true;
        }

        if (!env.isTest) {
            console.info(`[mail:disabled] would send "${subject}" to ${to}`);
        }
        return false;
    } catch (err) {
        if (!env.isTest) console.error(`[mail] failed to send "${subject}" to ${to}:`, err.message);
        return false;
    }
};

/**
 * Fire-and-forget send.
 *
 * `await sendMail(...)` made the caller wait for the provider, so a mail
 * backend that timed out after eight seconds turned every registration into a
 * nine-second request. The mail still has to be sent; the user just should not
 * be made to wait for it. sendMail never rejects, so nothing can float away
 * unhandled here.
 */
export const queueMail = (options) => {
    void sendMail(options);
};

/** One line at boot describing how mail will actually behave. */
export const describeMailSetup = () => {
    if (mailProvider === 'resend') {
        return `Mail: Resend HTTP API, from "${env.SENDER_EMAIL}"`;
    }
    if (mailProvider === 'brevo') {
        return `Mail: Brevo HTTP API, from "${env.SENDER_EMAIL}"`;
    }
    if (mailProvider === 'smtp') {
        const sandbox = /sandbox/i.test(env.SMTP_HOST);
        return (
            `Mail: SMTP ${env.SMTP_HOST}:${env.SMTP_PORT}, from "${env.SENDER_EMAIL}"` +
            (sandbox ? ' — SANDBOX host: messages are captured, never delivered to real inboxes' : '')
        );
    }
    return 'Mail: disabled (no BREVO_API_KEY, no RESEND_API_KEY and no SMTP credentials) — messages will only be logged';
};

export default sendMail;
