const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Select a user")
                .setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("user") || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTitle("👤 User Information")
            .addFields(
                { name: "Username", value: user.tag, inline: true },
                { name: "User ID", value: user.id, inline: true },
                { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` },
                { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` }
            );

        await interaction.reply({ embeds: [embed] });

    }
};