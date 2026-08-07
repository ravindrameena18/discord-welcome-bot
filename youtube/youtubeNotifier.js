const axios = require("axios");
const config = require("../config/config.json");
const YouTubeVideo = require("../models/YouTubeVideo");

let lastVideoId = "";

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

            for (const video of videos) {

                if (!video.id.videoId) continue;

                // Bot start होने पर latest वीडियो याद रखो
                if (!lastVideoId) {
                    lastVideoId = video.id.videoId;
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

                lastVideoId = video.id.videoId;
            }

        } catch (err) {
            console.error(err.response?.data || err);
        }

    }, 60000);

};