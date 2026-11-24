const path = require("path");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    StringSelectMenuBuilder
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

        const selectionRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("verification_games")
                .setPlaceholder("Select the games/content you create")
                .setMinValues(1)
                .setMaxValues(6)
                .addOptions(
                    { label: "Minecraft", value: "minecraft", emoji: "⛏️" },
                    { label: "Roblox", value: "roblox", emoji: "🧱" },
                    { label: "BGMI", value: "bgmi", emoji: "🎯" },
                    { label: "Valorant", value: "valorant", emoji: "🔫" },
                    { label: "GTA", value: "gta", emoji: "🚗" },
                    { label: "Content Creator", value: "content_creator", emoji: "🎥" }
                )
        );

        const verifyRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setLabel("Verify")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
            embeds: [embed],
            files: [attachment],
            components: [selectionRow, verifyRow]
        });

        await interaction.reply({
            content: "✅ Verify panel sent.",
            ephemeral: true
        });
    }
};
