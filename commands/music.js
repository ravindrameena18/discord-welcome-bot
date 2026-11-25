const { SlashCommandBuilder } = require("discord.js");
const musicManager = require("../music/musicManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("music")
        .setDescription("Show the music control panel"),

    async execute(interaction) {
        const queue = musicManager.getQueue(interaction.guildId);
        return interaction.reply({
            content: queue.current ? "🎵 Music controls are ready below." : "🎵 Use `/play <song or URL>` to start music.",
            ...musicManager.buildPanel(queue),
            ephemeral: true
        });
    }
};
