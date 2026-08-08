import nodemailer from 'nodemailer';
import env from './env.js';

/**
 * SMTP credentials used to be hardcoded in this file and committed to git.
 * They now come from the environment, and when they are absent (local dev, CI,
 * tests) mail is logged instead of sent so no flow silently breaks.
 */
const buildTransporter = () => {
  if (!env.mailEnabled) {
    return {
      sendMail: async (options) => {
        if (!env.isTest) {
          console.info(`[mail:disabled] would send "${options.subject}" to ${options.to}`);
        }
        return { messageId: 'mail-disabled', ...options };
      },
    };
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
};

export const transporter = buildTransporter();

/**
 * Fire-and-forget send. Mail failures must never fail the request that
 * triggered them — registration should still succeed if the SMTP host is down.
 */
export const sendMail = async ({ to, subject, text, html }) => {
  try {
    await transporter.sendMail({ from: env.SENDER_EMAIL, to, subject, text, html });
    return true;
  } catch (err) {
    if (!env.isTest) console.error(`[mail] failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
};

export default transporter;
