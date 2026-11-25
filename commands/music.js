const { SlashCommandBuilder } = require("discord.js");
const musicManager = require("../music/musicManager");
const musicConfig = require("../config/music.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("music")
        .setDescription("Show the music control panel"),

    async execute(interaction) {
        if (interaction.channelId !== musicConfig.MUSIC_TEXT_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ Use this command in <#${musicConfig.MUSIC_TEXT_CHANNEL_ID}>.`,
                ephemeral: true
            });
        }

        const queue = musicManager.getQueue(interaction.guildId);
        return interaction.reply({
            content: queue.current ? "🎵 Music controls are ready below." : "🎵 Use `/play <song or URL>` to start music.",
            ...musicManager.buildPanel(queue),
            ephemeral: true
        });
    }
};
