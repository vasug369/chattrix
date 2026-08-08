/**
 * Escape regex metacharacters in user-supplied search terms.
 *
 * `Post.find({ title: { $regex: userInput } })` previously passed raw input to
 * the regex engine: a query of `(a+)+$` is a ReDoS, and `.*` silently matches
 * everything. Callers must escape before building a $regex.
 */
export const escapeRegex = (input = '') =>
  String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Fields that must never leave the API, regardless of how a user doc was loaded. */
const PRIVATE_USER_FIELDS = [
  'password',
  'verifyOtp',
  'verifyOtpExpiry',
  'resetOtp',
  'resetOtpExpiry',
  'otpAttempts',
  '__v',
];

/**
 * Reduce a user document to the public shape.
 *
 * Defence in depth: the User schema also strips these in toJSON, but services
 * that use .lean() bypass schema transforms, so anything user-shaped that is
 * about to be serialised goes through here.
 */
export const toPublicUser = (user) => {
  if (!user) return user;
  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  for (const field of PRIVATE_USER_FIELDS) delete plain[field];
  return plain;
};

export const toPublicUsers = (users = []) => users.map(toPublicUser);

export default { escapeRegex, toPublicUser, toPublicUsers };
