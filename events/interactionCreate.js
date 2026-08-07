module.exports = {
    name: "interactionCreate",

    async execute(interaction) {

        // Slash Commands
        if (interaction.isChatInputCommand()) {

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) return;

            try {

                await command.execute(interaction);

            } catch (err) {

                console.error("SLASH COMMAND ERROR:");
                console.error(err);

                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(`❌ ${err.message}`);
                } else {
                    await interaction.reply({
                        content: `❌ ${err.message}`,
                        ephemeral: true
                    });
                }
            }

            return;
        }

        // Button Interactions
        if (interaction.isButton()) {

            const customId = interaction.customId;

            // Verify Button
            if (customId === "verify") {

                try {

                    const member = interaction.member;

                    const verifiedRole = interaction.guild.roles.cache.find(
                        role => role.name === "verified"
                    );

                    const memberRole = interaction.guild.roles.cache.find(
                        role => role.name === "Member"
                    );

                    const unverifiedRole = interaction.guild.roles.cache.find(
                        role => role.name === "Unverified"
                    );

                    if (!verifiedRole) {
                        return interaction.reply({
                            content: "❌ verified role not found.",
                            ephemeral: true
                        });
                    }

                    if (!memberRole) {
                        return interaction.reply({
                            content: "❌ Member role not found.",
                            ephemeral: true
                        });
                    }

                    // Add both roles
                    await member.roles.add([verifiedRole, memberRole]);

                    // Remove Unverified role
                    if (unverifiedRole) {
                        await member.roles.remove(unverifiedRole);
                    }

                    return interaction.reply({
                        content: "✅ You have been verified successfully!",
                        ephemeral: true
                    });

                } catch (err) {

                    console.error(err);

                    return interaction.reply({
                        content: "❌ Verification failed.",
                        ephemeral: true
                    });

                }

            }

        }

    }
};