import { OAuth2Client } from 'google-auth-library';
import env from './env.js';

/**
 * Verification of Google ID tokens, isolated in its own module.
 *
 * Kept separate from the service that uses it so tests can replace it without
 * reaching out to Google — the same seam the mail tests use for queueMail.
 */

let client = null;
const oauthClient = () => (client ??= new OAuth2Client(env.GOOGLE_CLIENT_ID));

/**
 * Check that a credential really was minted by Google *for this application*,
 * and return its claims.
 *
 * `audience` is the part that matters. The library verifies the signature
 * against Google's public keys, the issuer, and the expiry — but without
 * pinning the audience, a valid Google ID token issued for *any other site*
 * would also pass, and anyone with a Google login somewhere else could present
 * it here and be signed in as that email. Pinning it to our own client ID is
 * what makes the token meaningful as proof about *our* users.
 *
 * Throws when the token is invalid, expired, or not addressed to us.
 */
export const verifyGoogleIdToken = async (credential) => {
  const ticket = await oauthClient().verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  return ticket.getPayload();
};

export default verifyGoogleIdToken;
