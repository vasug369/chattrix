import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        password: {
            // `select: false` means a plain User.find() no longer carries the
            // bcrypt hash around. Code that genuinely needs it (login, password
            // reset) must ask for it with .select('+password').
            type: String,
            // Required only for local accounts. A Google account has no
            // password to store, and inventing a random one would be worse
            // than absent: it would look like a usable credential to every
            // future reader of this schema.
            required: function required() {
                return !this.googleId;
            },
            select: false,
        },

        // Google's stable subject claim ("sub"), not the email — the email on a
        // Google account can change, the subject cannot.
        //
        // `sparse` is essential: without it, the unique index would treat every
        // local account's missing googleId as the same null and reject the
        // second one.
        googleId: {
            type: String,
            default: undefined,
            unique: true,
            sparse: true,
            select: false,
        },

        // How this account can authenticate. An account created locally and
        // later linked to Google carries both.
        authProviders: {
            type: [String],
            enum: ['local', 'google'],
            default: ['local'],
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 160,
            default: "",
        },
        pic: {
            // Empty rather than the old iconarchive.com URL, which pointed at a
            // download *page* (not an image) and so rendered as a broken image
            // for every user who never set a picture. The UI draws a generated
            // initial avatar when this is empty.
            type: String,
            default: ""
        },

        followers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        following: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        // OTP fields hold a bcrypt hash, never the six digits themselves — a
        // leaked database read otherwise hands over working reset codes.
        verifyOtp: { type: String, default: "", select: false },
        verifyOtpExpiry: { type: Date, default: null, select: false },
        isAccountVerified: { type: Boolean, default: false },

        resetOtp: { type: String, default: "", select: false },
        resetOtpExpiry: { type: Date, default: null, select: false },

        otpAttempts: { type: Number, default: 0, select: false },

        // Bumped on password reset so refresh tokens issued before the reset
        // stop validating (enforced in authMiddleware).
        tokenVersion: { type: Number, default: 0 },
    },
    { timestamps: true }
);

/**
 * Last line of defence against leaking secrets: even if a query forgets to
 * exclude these, serialising the document drops them.
 */
userSchema.set("toJSON", {
    transform(_doc, ret) {
        delete ret.password;
        delete ret.verifyOtp;
        delete ret.verifyOtpExpiry;
        delete ret.resetOtp;
        delete ret.resetOtpExpiry;
        delete ret.otpAttempts;
        delete ret.googleId;
        delete ret.__v;
        return ret;
    },
});

const User = mongoose.model('User', userSchema);

export default User;
