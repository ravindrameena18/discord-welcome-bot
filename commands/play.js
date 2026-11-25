const { SlashCommandBuilder } = require("discord.js");
const musicManager = require("../music/musicManager");
const musicConfig = require("../config/music.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a YouTube, SoundCloud or Spotify search/link")
        .addStringOption(option => option
            .setName("query")
            .setDescription("Song name or URL")
            .setRequired(true)),

    async execute(interaction) {
        if (interaction.channelId !== musicConfig.MUSIC_TEXT_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ Use this command in <#${musicConfig.MUSIC_TEXT_CHANNEL_ID}>.`,
                ephemeral: true
            });
        }

        const query = interaction.options.getString("query")?.trim();
        if (!query) {
            return interaction.reply({
                content: "❌ Enter a song name or URL after `/play`.",
                ephemeral: true
            });
        }

        await interaction.deferReply();
        try {
            await musicManager.start(query, interaction);
            await interaction.editReply("✅ Added to the music player.");
        } catch (error) {
            console.error("PLAY COMMAND ERROR:", error);
            await interaction.editReply(`❌ ${error.message || "Unable to play this track."}`);
        }
    }
};
