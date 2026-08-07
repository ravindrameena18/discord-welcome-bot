const mongoose = require("mongoose");

const youtubeVideoSchema = new mongoose.Schema({
    videoId: {
        type: String,
        unique: true
    },
    type: {
        type: String,
        enum: ["video", "live", "short"]
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("YouTubeVideo", youtubeVideoSchema);