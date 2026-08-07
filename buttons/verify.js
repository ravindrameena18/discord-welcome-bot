const config = require("../config/config.json");

module.exports = {
    customId: "verify",

    async execute(interaction) {

        const memberRole = interaction.guild.roles.cache.get(config.MEMBER_ROLE_ID);
        const unverifiedRole = interaction.guild.roles.cache.get(config.UNVERIFIED_ROLE_ID);

        if (!memberRole) {
            return interaction.reply({
                content: "❌ Member role not found.",
                ephemeral: true
            });
        }

        // Agar user pehle se verified hai
        if (interaction.member.roles.cache.has(memberRole.id)) {
            return interaction.reply({
                content: "✅ You are already verified.",
                ephemeral: true
            });
        }

        // Unverified role hatao
        if (unverifiedRole && interaction.member.roles.cache.has(unverifiedRole.id)) {
            try {
    await interaction.member.roles.remove(unverifiedRole);
    console.log("UNVERIFIED REMOVED");
} catch (err) {
    console.error(err);
}
        }

        // Member role do
        await interaction.member.roles.add(memberRole);

        return interaction.reply({
            content: "🎉 Verification Successful!",
            ephemeral: true
        });
    }
};