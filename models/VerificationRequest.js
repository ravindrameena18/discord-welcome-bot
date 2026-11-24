const mongoose = require("mongoose");

const verificationRequestSchema = new mongoose.Schema(
    {
        requestId: { type: String, required: true, unique: true },
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        channelId: { type: String, required: true },
        messageId: { type: String },
        selected: [{ type: String, required: true }],
        decisions: { type: Map, of: String, default: {} },
        status: { type: String, enum: ["pending", "completed"], default: "pending" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("VerificationRequest", verificationRequestSchema);
