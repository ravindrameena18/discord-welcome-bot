const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const config = require("../config/config.json");

module.exports = {
    name: "guildMemberAdd",

    /**
     * @param {import("discord.js").GuildMember} member
     */
    async execute(member) {
        console.log("JOIN EVENT WORKING");
        console.log(`Member: ${member.user.username} (ID: ${member.user.id})`);

        // 1. Assign Unverified Role
        try {
            if (!config.UNVERIFIED_ROLE_ID) {
                throw new Error("UNVERIFIED_ROLE_ID is not configured in config/config.json");
            }

            let role = member.guild.roles.cache.get(config.UNVERIFIED_ROLE_ID);
            if (!role) {
                role = await member.guild.roles.fetch(config.UNVERIFIED_ROLE_ID).catch(() => null);
            }

            if (!role) {
                throw new Error(`Role with ID ${config.UNVERIFIED_ROLE_ID} not found in guild`);
            }

            await member.roles.add(role);
            console.log("UNVERIFIED ROLE ASSIGNED");
        } catch (err) {
            const error = /** @type {any} */ (err);
            console.error("ROLE ASSIGN FAILED:", error?.message || error);
        }

        // 2. Send Welcome Message to Server Welcome Channel
        try {
            if (!config.WELCOME_CHANNEL_ID) {
                throw new Error("WELCOME_CHANNEL_ID is not configured in config/config.json");
            }

            let channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID);
            if (!channel) {
                channel = await member.guild.channels.fetch(config.WELCOME_CHANNEL_ID).catch(() => null);
            }

            if (!channel) {
                throw new Error(`Channel with ID ${config.WELCOME_CHANNEL_ID} not found in guild`);
            }

            const welcomeEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setAuthor({
                    name: `🎉 Welcome to ${member.guild.name}`
                })
                .setDescription(
`Hey ${member}! 👋

Thanks for joining **${member.guild.name}** ❤️

We're excited to have you in our community!
Make sure to check out the server and verify yourself to unlock all channels.

Enjoy your stay and have fun! 🚀`
                )
                .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
                .setFooter({
                    text: `Member #${member.guild.memberCount}`
                })
                .setTimestamp();

            await channel.send({
                embeds: [welcomeEmbed]
            });
            console.log("WELCOME MESSAGE SENT");
        } catch (err) {
            const error = /** @type {any} */ (err);
            console.error("WELCOME CHANNEL FAILED:", error?.message || error);
        }

        // 3. Send DM Welcome Message
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(`🎉 Welcome to ${member.guild.name}`)
                .setDescription(
`## 👋 Hello, **${member.user.username}**

Thank you for joining **${member.guild.name}**! ❤️

We're excited to have you in our gaming community.

### 🚀 Get Started
✅ Verify yourself to unlock all channels.
🎁 Participate in Giveaways.
🎮 Join Events & Community Activities.
🎥 Stay updated with our latest videos.
📸 Follow us on Instagram for exclusive content.

━━━━━━━━━━━━━━━━━━━━━━
**Click the buttons below to get started!**`
                )
                .setThumbnail(member.guild.iconURL() || member.user.displayAvatarURL())
                .setFooter({
                    text: `${member.guild.name} Community • See you inside the server! 🚀`
                })
                .setTimestamp();

            const dmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("✅ Verify Server")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://discord.gg/MJ8mWUeER"),

                new ButtonBuilder()
                    .setLabel("🎥 YouTube")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://www.youtube.com/@GYRORISHABH"),

                new ButtonBuilder()
                    .setLabel("📸 Instagram")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://www.instagram.com/gyrorishabh/?hl=en")
            );

            await member.send({
                embeds: [dmEmbed],
                components: [dmRow]
            });
            console.log("WELCOME DM SENT");
        } catch (err) {
            const error = /** @type {any} */ (err);
            console.error("DM FAILED:", error?.message || error);
        }
    }
};