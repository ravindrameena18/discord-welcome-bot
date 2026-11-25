const axios = require("axios");
const config = require("../config/config.json");
const YouTubeVideo = require("../models/YouTubeVideo");

const POLL_INTERVAL_MS = 60000;
let polling = false;
let initialized = false;

function readFeedEntries(xml) {
    return [...String(xml).matchAll(/<entry[\s\S]*?<\/entry>/g)].map(match => {
        const entry = match[0];
        const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
        return videoId ? { videoId } : null;
    }).filter(Boolean);
}

async function poll(client, channelId) {
    if (polling) return;
    polling = true;

    try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
        const response = await axios.get(feedUrl, {
            timeout: 15000,
            headers: { "User-Agent": "GYRO RISHABH Discord Bot" }
        });
        const videos = readFeedEntries(response.data);
        if (!videos.length) return;

        // Seed existing feed items after startup; never announce old uploads as new.
        if (!initialized) {
            for (const video of videos) {
                await YouTubeVideo.updateOne(
                    { videoId: video.videoId },
                    { $setOnInsert: { videoId: video.videoId, type: "video" } },
                    { upsert: true }
                );
            }
            initialized = true;
            console.log("✅ [YouTube Notifier] RSS feed initialized without API quota.");
            return;
        }

        for (const video of videos.reverse()) {
            const exists = await YouTubeVideo.findOne({ videoId: video.videoId });
            if (exists) continue;

            await YouTubeVideo.create({ videoId: video.videoId, type: "video" });
            const channel = await client.channels.fetch(config.YOUTUBE_NOTIFICATION_CHANNEL_ID).catch(() => null);
            if (channel) {
                await channel.send({
                    content: `@everyone\n\n📢 **New Upload on GYRO LIVE YT!**\n\n🎥 https://youtu.be/${video.videoId}`,
                    allowedMentions: { parse: ["everyone"] }
                });
                console.log(`✅ [YouTube Notifier] Notification sent: ${video.videoId}`);
            }
        }
    } catch (error) {
        console.error("❌ [YouTube Notifier RSS Error]:", error.response?.status || error.message || error);
    } finally {
        polling = false;
    }
}

module.exports = async (client) => {
    const channelId = (process.env.YOUTUBE_CHANNEL_ID || process.env.YT_CHANNEL_ID)?.trim();
    if (!channelId) {
        console.warn("⚠️ [YouTube Notifier] YOUTUBE_CHANNEL_ID is not defined. Notifications are paused.");
        return;
    }

    await poll(client, channelId);
    setInterval(() => poll(client, channelId), POLL_INTERVAL_MS);
};
