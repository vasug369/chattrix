import mongoose from "mongoose";

export const ADMIN_ACTIONS = ["report.removed", "report.dismissed", "user.suspended", "user.unsuspended"];

/**
 * Audit log of every moderation action: who did what, to whom, and why.
 *
 * Append-only by design: no route updates or deletes these documents.
 */
const adminActionSchema = new mongoose.Schema(
    {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        action: { type: String, enum: ADMIN_ACTIONS, required: true },
        targetType: { type: String, default: "" },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
        targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        note: { type: String, trim: true, maxlength: 500, default: "" },
        // Action-specific details, e.g. the suspension end date.
        meta: { type: Object, default: {} },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

adminActionSchema.index({ createdAt: -1 });

const AdminAction = mongoose.model("AdminAction", adminActionSchema);

export default AdminAction;
