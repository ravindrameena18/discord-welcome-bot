const { EmbedBuilder } = require("discord.js");
const config = require("../config/config.json");

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {

        console.log("JOIN EVENT WORKING");
        console.log(member.user.tag);

        // Auto Role
        const role = member.guild.roles.cache.get(config.AUTO_ROLE_ID);

        if (role) {
            await member.roles.add(role);
        }

        // Welcome Channel
        const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID);

        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setAuthor({
                name: "🎉 Welcome to GYRORISHABH"
            })
            .setDescription(
`Hey! ${member}

Thanks for joining **${member.guild.name}** ❤️

We're excited to have you here.

### 📌 Important Channels

📜 **Rules:** <#1517417815064186982>

📢 **Announcements:** <#1517417805744574505>

🎁 **Giveaways:** <#1517417831493402664>

🎉 **Events:** <#1517417833259335753>

Enjoy your stay and have fun! 🚀`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({
                text: `Member #${member.guild.memberCount}`
            })
            .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

    }
};