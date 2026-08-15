import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

/**
 * Every secret the app needs, validated once at boot.
 *
 * Missing/short secrets used to fail lazily and confusingly — a missing
 * JWT_REFRESH_SECRET surfaced as a generic 500 from /api/auth/login, because
 * jwt.sign() throws when the secret is undefined. Failing here instead makes
 * misconfiguration obvious before the server accepts a single request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Mongo: either a full URI, or the DB_* triple the project already used.
  MONGO_URI: z.string().optional(),
  DB_Host: z.string().optional(),
  DB_Pass: z.string().optional(),
  DB_Name: z.string().optional(),

  JWT_SECRET: isTest
    ? z.string().default('test-access-secret-not-used-in-production')
    : z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: isTest
    ? z.string().default('test-refresh-secret-not-used-in-production')
    : z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),

  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),

  CORS_ORIGINS: z
    .string()
    .default(
      [
        'http://localhost:5173',
        'https://chattrix-social.vercel.app',
        // Retained so the previous deployment URL keeps working during the
        // domain change; safe to drop once nothing points at it.
        'https://chattrix-nmlf.vercel.app',
      ].join(',')
    ),

  // Google sign-in. Optional: without it the endpoint refuses politely and the
  // frontend hides the button, rather than the server failing to boot.
  //
  // This is the OAuth *client ID*, which is public by design — it ships in the
  // frontend bundle. It is not a secret, but it is still load-bearing: it is
  // the `audience` every incoming Google ID token is checked against, which is
  // what stops a token minted for some other site being replayed at ours.
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Public address of the frontend, used for links inside emails. Deliberately
  // not derived from CORS_ORIGINS: that list is ordered for local development,
  // so its first entry is usually localhost — which would ship a dead link to
  // every new user.
  APP_URL: z.string().url().default('https://chattrix-social.vercel.app'),

  // Mail — optional so local dev and tests run without SMTP credentials.
  SMTP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().int().positive().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Resend HTTP API. Preferred over SMTP because managed hosts commonly
  // filter outbound SMTP ports, which is what broke the previous setup.
  RESEND_API_KEY: z.string().optional(),

  // Brevo HTTP API. Like Resend, chosen over SMTP because managed hosts
  // commonly filter outbound SMTP ports.
  BREVO_API_KEY: z.string().optional(),

  // Force a provider instead of auto-detecting. Useful when more than one
  // credential is present and the implicit precedence would pick the wrong
  // one — a silent misconfiguration is exactly how the CORS allow-list and
  // the Mailtrap sandbox each went unnoticed.
  MAIL_PROVIDER: z.enum(['resend', 'brevo', 'smtp', 'disabled']).optional(),

  // Until a domain is verified with the provider, this is the only address
  // Resend will accept as a sender. Change it once your own domain is added.
  SENDER_EMAIL: z.string().default('Chattrix <onboarding@resend.dev>'),

  // Cloudinary — optional; uploads degrade gracefully when unset.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  // bcrypt work factor. Deliberately low under test — cost 10 makes each
  // register+login round-trip ~300ms, which dominated the suite runtime.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(isTest ? 4 : 10),
});

/**
 * Normalise one allow-list entry so it can be compared to a browser `Origin`.
 *
 * A browser always sends scheme://host[:port] with no trailing slash and a
 * lowercase scheme and host. Anything else in the configured list will simply
 * never match, and the failure is silent: the request completes, the response
 * just carries no CORS header, and the browser blocks it on the client side
 * with nothing in the server log. Quotes, whitespace and a trailing slash are
 * the three ways that has actually happened here.
 */
export const normalizeOrigin = (value = '') =>
  String(value)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/+$/, '')
    .replace(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/[^/]+)/, (m) => m.toLowerCase());

export const parseOrigins = (value = '') =>
  String(value)
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const raw = parsed.data;

const mongoUri =
  raw.MONGO_URI ||
  (raw.DB_Host && raw.DB_Pass
    ? `mongodb+srv://${raw.DB_Host}:${raw.DB_Pass}@cluster0.ffirymn.mongodb.net/${
        raw.DB_Name ?? 'chattrix'
      }?retryWrites=true&w=majority&appName=Cluster0`
    : undefined);

export const env = {
  ...raw,
  mongoUri,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: parseOrigins(raw.CORS_ORIGINS),
  // Never send real mail from a test run. dotenv loads the developer's .env
  // even under NODE_ENV=test, so without this guard every registration in the
  // suite opened a live SMTP connection (~7s per call) and spammed the inbox.
  mailEnabled: Boolean(raw.SMTP_USER && raw.SMTP_PASS) && !isTest,

  // Same guard for the HTTP provider, and for the same reason: adding
  // RESEND_API_KEY to a local .env would otherwise make the test suite send
  // real email to whatever addresses the fixtures happen to use.
  resendEnabled: Boolean(raw.RESEND_API_KEY) && !isTest,
  brevoEnabled: Boolean(raw.BREVO_API_KEY) && !isTest,
  googleAuthEnabled: Boolean(raw.GOOGLE_CLIENT_ID),
  // Same `!isTest` guard as the mail providers, and for the same reason:
  // dotenv loads the developer's .env even under NODE_ENV=test, so the suite
  // was configuring multer's Cloudinary storage with real credentials and
  // uploading test fixtures to a live account. It surfaced only because those
  // keys have since been rotated — "Unknown API key" as an unhandled rejection
  // during a test run. With valid keys it would have quietly worked.
  cloudinaryEnabled:
    Boolean(raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET) &&
    !isTest,
};

export default env;
