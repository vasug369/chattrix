import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },

    pic: {
        type: String,
        default: ""
    },

    bio: {
        type: String,
        default: "",
        maxlength: 160,
        trim: true
    },

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    verifyOtp: {
        type: String,
        default: ""
    },

    verifyOtpExpireAt: {
        type: Date,
        default: 0
    },

    isAccountVerified: {
        type: Boolean,
        default: false
    },

    resetOtp: {
        type: String,
        default: ""
    },

    resetOtpExpireAt: {
        type: Date,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

const User = mongoose.model('User', userSchema);

export default User;
