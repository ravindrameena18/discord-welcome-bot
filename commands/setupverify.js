const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setupverify")
        .setDescription("Send the verify panel"),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("✅ Verification")
            .setDescription("Click the button below to verify yourself.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setLabel("Verify")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: "✅ Verify panel sent.",
            ephemeral: true
        });
    }
};