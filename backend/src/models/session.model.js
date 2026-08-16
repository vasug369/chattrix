import mongoose from 'mongoose';

/**
 * One row per signed-in device.
 *
 * `tokenVersion` on the User gives all-or-nothing revocation: bumping it kills
 * every session at once, which is right for a password reset but useless for
 * "sign out my old phone". Tokens now carry a `jti` that points here, so a
 * single session can be revoked without disturbing the others.
 *
 * The trade-off is a database lookup per authenticated request. That is .
 * acceptable because the request already loads the User document to authorise
 * itself, so this is a second indexed read rather than a first one.
 */
const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // The `jti` claim carried by both tokens in this session.
        jti: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        userAgent: { type: String, default: '' },

        // A human label derived from the user agent ("Chrome on Windows"), so
        // the UI never has to render a raw UA string at somebody.
        device: { type: String, default: 'Unknown device' },

        ip: { type: String, default: '' },

        lastSeenAt: { type: Date, default: Date.now },

        revokedAt: { type: Date, default: null },

        // Mirrors the refresh token's lifetime. Sessions cannot outlive the
        // token that points at them.
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

/**
 * Mongo drops the document once `expiresAt` passes, so expired sessions do not
 * accumulate forever and the "where you're logged in" list stays truthful
 * without a cleanup job. `expireAfterSeconds: 0` means "expire at the value of
 * this field" rather than "expire N seconds after it".
 */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// The listing query: a user's live sessions, most recently used first.
sessionSchema.index({ user: 1, revokedAt: 1, lastSeenAt: -1 });

sessionSchema.set('toJSON', {
    transform(_doc, ret) {
        // The jti is a bearer credential in all but name — anyone holding it
        // plus a signing key could mint a token for this session. It never
        // leaves the server.
        delete ret.jti;
        delete ret.__v;
        return ret;
    },
});

const Session = mongoose.model('Session', sessionSchema);

export default Session;
