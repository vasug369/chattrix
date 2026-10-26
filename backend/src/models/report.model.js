import mongoose from "mongoose";

export const REPORT_TARGETS = ["post", "comment", "message", "user"];
export const REPORT_REASONS = ["spam", "harassment", "hate", "nudity", "self_harm", "other"];
export const REPORT_STATUSES = ["open", "resolved", "dismissed"];

/**
 * A user's report of a post, comment, message or account.
 *
 * `snapshot` keeps the reported text as it was at report time, so moderators
 * see the evidence even if the author edits or deletes it first. It is the only
 * way a message's content ever reaches a moderator: direct messages are not
 * browsable, only reported ones.
 */
const reportSchema = new mongoose.Schema(
    {
        reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        targetType: { type: String, enum: REPORT_TARGETS, required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
        // Parent post, for comment reports: a comment is a subdocument.
        post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
        // Who wrote the reported content (or the reported account itself).
        targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        reason: { type: String, enum: REPORT_REASONS, required: true },
        details: { type: String, trim: true, maxlength: 1000, default: "" },
        snapshot: { type: String, maxlength: 6000, default: "" },

        status: { type: String, enum: REPORT_STATUSES, default: "open", index: true },
        resolution: { type: String, enum: ["removed", "dismissed"], default: undefined },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        resolvedAt: { type: Date, default: null },
        note: { type: String, trim: true, maxlength: 500, default: "" },
    },
    { timestamps: true }
);

// One open report per person per item, so a single user cannot inflate a
// target's report count by submitting the same report repeatedly.
reportSchema.index(
    { reporter: 1, targetType: 1, targetId: 1 },
    { unique: true, partialFilterExpression: { status: "open" } }
);
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
