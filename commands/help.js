const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all bot commands"),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("🤖 GYRO BOT Help")
            .setDescription("Available Commands")
            .addFields(
                { name: "/ping", value: "Check bot latency" },
                { name: "/help", value: "Show help menu" }
            )
            .setFooter({ text: "GYRO RISHABH BOT" });

        await interaction.reply({ embeds: [embed] });

    },
};