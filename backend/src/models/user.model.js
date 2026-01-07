import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  verifyOtp: {
    type: String,
    default: "",
  },

  verifyOtpExpiry: {
    type: Date,
    default: 0,
  },

  isAccountVerified: {
    type: Boolean,
    default: false,
  },

  resetOtp: {
    type: String,
    default: "",
  },

  resetOtpExpiry: {
    type: Date,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const User = mongoose.model("User", userSchema);

export default User;
