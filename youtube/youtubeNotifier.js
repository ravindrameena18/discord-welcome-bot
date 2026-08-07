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
                        maxResults: 1
                    }
                }
            );

            const video = res.data.items[0];

            if (!video) return;

            // Bot start होने पर latest वीडियो याद रखो
            if (!lastVideoId) {
                lastVideoId = video.id.videoId;
                return;
            }

            // पहले से भेजा जा चुका है?
            const exists = await YouTubeVideo.findOne({
                videoId: video.id.videoId
            });

            if (exists) return;

            await YouTubeVideo.create({
                videoId: video.id.videoId,
                type: "video"
            });

            const channel = await client.channels.fetch(
                config.YOUTUBE_NOTIFICATION_CHANNEL_ID
            );

            await channel.send({
                content:
`@everyone  @verified  @Unverified 

📢 **New video from GYRO LIVE YT!**

https://youtu.be/${video.id.videoId}`,

                allowedMentions: {
                    parse: ["everyone"]
                }
            });

            console.log("YouTube notification sent.");

            lastVideoId = video.id.videoId;

        } catch (err) {

            console.log(err.message);

        }

    }, 60000);

};