import env from '../config/env.js';
import * as googleClient from '../config/googleClient.js';
import { queueMail } from '../config/mailer.js';
import User from '../models/user.model.js';
import { badRequest, forbidden, unauthorized } from '../utils/AppError.js';
import { issueTokens, welcomeEmail } from './authService.js';
import { createSession } from './sessionService.js';

/**
 * Sign in (or sign up) with a Google ID token.
 *
 * The frontend uses Google Identity Services, which hands the browser a signed
 * ID token and nothing else. That token is the entire credential: we verify it
 * server-side and, if it checks out, issue our own session exactly as a
 * password login would. Google is only ever asked "is this really this person?"
 * — it never becomes the thing that keeps them logged in.
 *
 * Deliberately not the OAuth authorization-code flow: that would require
 * storing a client *secret* and handling a redirect round-trip, to end up in
 * the same place. We do not need offline access to any Google API, only proof
 * of identity at the moment of sign-in.
 */

/** Google sends this as a real boolean or the string "true" depending on path. */
const isEmailVerified = (payload) =>
  payload.email_verified === true || payload.email_verified === 'true';

/**
 * The schema wants 2-50 characters; Google promises neither. A display name of
 * one character, or of 200, would otherwise fail validation *after* the token
 * had already been accepted, surfacing as a confusing 500 on a valid login.
 */
const displayNameFrom = (payload, email) => {
  const candidate = (payload.name || email.split('@')[0] || '').trim().slice(0, 50);
  return candidate.length >= 2 ? candidate : 'New user';
};

export const signInWithGoogle = async (credential, req) => {
  if (!env.googleAuthEnabled) {
    // 403 rather than 500: the server is fine, this deployment simply has no
    // GOOGLE_CLIENT_ID. Saying so plainly beats a generic failure when the
    // button appears in an environment nobody configured.
    throw forbidden('Google sign-in is not configured on this server');
  }

  let payload;
  try {
    payload = await googleClient.verifyGoogleIdToken(credential);
  } catch {
    // The underlying message names signatures and audiences, which is useful
    // in a log and meaningless to a user. Nothing about *why* it failed is
    // safe to hand back — a bad token and a token for another site should look
    // identical from outside.
    throw unauthorized('Google sign-in failed');
  }

  if (!payload?.sub) throw unauthorized('Google sign-in failed');
  if (!payload.email) throw badRequest('That Google account has no email address');

  // An unverified Google address must never be trusted to reach an existing
  // account: anyone can add an address they do not own to a Google profile, and
  // linking on it would be a free takeover of the matching local account.
  if (!isEmailVerified(payload)) {
    throw unauthorized('That Google account has no verified email address');
  }

  const email = payload.email.toLowerCase();

  // Match on the subject claim first. It is Google's stable identifier; the
  // email on an account can be changed, so treating email as the identity
  // would silently orphan the account when that happens.
  let user = await User.findOne({ googleId: payload.sub });
  let isNewAccount = false;

  if (!user) {
    user = await User.findOne({ email });

    if (user) {
      // Same verified address, existing local account: link rather than
      // refusing or creating a duplicate. Signing up with a password and later
      // clicking "Continue with Google" is normal behaviour, not an error.
      user.googleId = payload.sub;
      if (!user.authProviders.includes('google')) user.authProviders.push('google');
      // Google has already proven the address, so any pending verification on
      // our side is now moot.
      user.isAccountVerified = true;
      if (!user.pic && payload.picture) user.pic = payload.picture;
      await user.save();
    } else {
      user = await User.create({
        name: displayNameFrom(payload, email),
        email,
        googleId: payload.sub,
        authProviders: ['google'],
        // No OTP is issued: Google verified the address, so making the user
        // confirm it again would be theatre.
        isAccountVerified: true,
        ...(payload.picture ? { pic: payload.picture } : {}),
      });
      isNewAccount = true;
    }
  }

  if (isNewAccount) queueMail({ to: email, ...welcomeEmail(user.name) });

  const session = await createSession(user._id, req);

  return { user, session, isNewAccount, ...issueTokens(user, session.jti) };
};

export default signInWithGoogle;
