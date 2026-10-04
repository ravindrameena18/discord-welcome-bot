const path = require("path");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setupverify")
        .setDescription("Send the verify panel"),

    async execute(interaction) {

        const imagePath = path.join(__dirname, "..", "verify.png");
        const attachment = new AttachmentBuilder(imagePath, { name: "verify.png" });

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("✅ Verification")
            .setDescription("Click the button below to verify yourself.")
            .setImage("attachment://verify.png");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setLabel("Verify")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
            embeds: [embed],
            files: [attachment],
            components: [row]
        });

        await interaction.reply({
            content: "✅ Verify panel sent.",
            ephemeral: true
        });
    }
};