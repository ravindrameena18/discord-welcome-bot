const axios = require("axios");
const config = require("../config/config.json");
const YouTubeVideo = require("../models/YouTubeVideo");

let lastVideoId = "";

module.exports = async (client) => {
    const initialApiKey = (process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY)?.trim();
    const initialChannelId = (process.env.YOUTUBE_CHANNEL_ID || process.env.YT_CHANNEL_ID)?.trim();

    if (!initialApiKey) {
        console.warn("⚠️ [YouTube Notifier] YOUTUBE_API_KEY is not defined in environment variables. YouTube notifications will be paused.");
    }
    if (!initialChannelId) {
        console.warn("⚠️ [YouTube Notifier] YOUTUBE_CHANNEL_ID is not defined in environment variables. YouTube notifications will be paused.");
    }

    setInterval(async () => {

        try {

            const apiKey = (process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY)?.trim();
            const channelId = (process.env.YOUTUBE_CHANNEL_ID || process.env.YT_CHANNEL_ID)?.trim();

            if (!apiKey || !channelId) {
                return;
            }

            const res = await axios.get(
                "https://www.googleapis.com/youtube/v3/search",
                {
                    params: {
                        key: apiKey,
                        channelId: channelId,
                        part: "snippet",
                        order: "date",
                        maxResults: 3,
                        type: "video"
                    }
                }
            );

            const videos = res.data.items;

            if (!videos || videos.length === 0) return;

            for (const video of videos) {

                if (!video.id || !video.id.videoId) continue;

                // When bot starts, remember the latest video and prevent sending old notifications
                if (!lastVideoId) {
                    lastVideoId = video.id.videoId;
                    const initialExists = await YouTubeVideo.findOne({ videoId: video.id.videoId });
                    if (!initialExists) {
                        await YouTubeVideo.create({
                            videoId: video.id.videoId,
                            type: "video"
                        });
                    }
                    continue;
                }

                const exists = await YouTubeVideo.findOne({
                    videoId: video.id.videoId
                });

                if (exists) continue;

                await YouTubeVideo.create({
                    videoId: video.id.videoId,
                    type: "video"
                });

                const channel = await client.channels.fetch(
                    config.YOUTUBE_NOTIFICATION_CHANNEL_ID
                );

                if (channel) {
                    await channel.send({
                        content:
`@everyone

📢 **New Upload on GYRO LIVE YT!**

🎥 https://youtu.be/${video.id.videoId}`,

                        allowedMentions: {
                            parse: ["everyone"]
                        }
                    });

                    console.log(`Notification sent: ${video.id.videoId}`);
                }

                lastVideoId = video.id.videoId;
            }

        } catch (err) {
            if (err.response?.status === 403) {
                console.error(
                    "❌ [YouTube Notifier 403 Error]:",
                    err.response?.data?.error?.message || "Permission denied. Ensure YOUTUBE_API_KEY is properly set in Render environment variables and YouTube Data API v3 is enabled."
                );
            } else {
                console.error("❌ [YouTube Notifier Error]:", err.response?.data || err.message || err);
            }
        }

    }, 60000);

};