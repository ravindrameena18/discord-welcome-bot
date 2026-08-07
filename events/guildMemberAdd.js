const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {

        try {

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("🎉 Welcome to GYRORISHABH")
                .setDescription(
`## 👋 Hello, **${member.user.username}**

Thank you for joining **GYRORISHABH**! ❤️

We're excited to have you in our gaming community.

### 🚀 Get Started

✅ Verify yourself to unlock all channels.

🎁 Participate in Giveaways.

🎮 Join Events & Community Activities.

🎥 Stay updated with our latest videos.

📸 Follow us on Instagram for exclusive content.

━━━━━━━━━━━━━━━━━━━━━━

**Click the buttons below to get started!**
`
                )
                .setThumbnail(member.guild.iconURL({ dynamic: true }))
                .setFooter({
                    text: "GYRORISHABH Community • See you inside the server! 🚀"
                })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(

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
                embeds: [embed],
                components: [row]
            });

        } catch (err) {

            console.log(`DM could not be sent to ${member.user.tag}`);

        }

    }
};