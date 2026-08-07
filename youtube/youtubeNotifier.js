const axios = require("axios");
const config = require("../config/config.json");
const YouTubeVideo = require("../models/YouTubeVideo");

let initialized = false;

module.exports = async (client) => {

    setInterval(async () => {

        try {

            const res = await axios.get(
                "https://www.googleapis.com/youtube/v3/search",
                {
                    params: {
                        key: process.env.YOUTUBE_API_KEY,
                        channelId: process.env.YOUTUBE_CHANNEL_ID,
                        part: "snippet",
                        order: "date",
                        maxResults: 3,
                        type: "video"
                    }
                }
            );

            const videos = res.data.items;

            if (!videos || videos.length === 0) return;

            // पहली बार Bot start होने पर पुराने uploads को ignore करो
            if (!initialized) {
                for (const video of videos) {
                    await YouTubeVideo.updateOne(
                        { videoId: video.id.videoId },
                        {
                            videoId: video.id.videoId,
                            type: "video"
                        },
                        { upsert: true }
                    );
                }

                initialized = true;
                console.log("YouTube notifier initialized.");
                return;
            }

            for (const video of videos) {

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

                await channel.send({
                    content: `@everyone

📢 **New Upload on GYRO LIVE YT!**

🎥 https://youtu.be/${video.id.videoId}`,
                    allowedMentions: {
                        parse: ["everyone"]
                    }
                });

                console.log(`Notification sent: ${video.id.videoId}`);
            }

        } catch (err) {

            console.error("YouTube API Error:", err.response?.status || err.message);

        }

    }, 60000);

};