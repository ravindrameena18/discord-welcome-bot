const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require("discord.js");
const config = require("../config/config.json");
const VerificationRequest = require("../models/VerificationRequest");

const gameLabels = {
    minecraft: "Minecraft",
    roblox: "Roblox",
    bgmi: "BGMI",
    valorant: "Valorant",
    gta: "GTA",
    content_creator: "Content Creator"
};

const pendingSelections = new Map();

function selectionKey(interaction) {
    return `${interaction.guildId}:${interaction.user.id}`;
}

function decisionText(decision) {
    if (decision === "approved") return "✅ Approved";
    if (decision === "rejected") return "❌ Rejected";
    return "⏳ Pending";
}

function getDecision(request, key) {
    return request.decisions?.get ? request.decisions.get(key) : request.decisions?.[key];
}

function buildApprovalComponents(request) {
    if (request.status === "completed") return [];

    const rows = [];
    let row = new ActionRowBuilder();

    for (const key of request.selected) {
        const decision = getDecision(request, key);

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`verification:approve:${request.requestId}:${key}`)
                .setLabel(`Approve ${gameLabels[key]}`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(Boolean(decision)),
            new ButtonBuilder()
                .setCustomId(`verification:reject:${request.requestId}:${key}`)
                .setLabel(`Reject ${gameLabels[key]}`)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(Boolean(decision))
        );

        if (row.components.length === 4) {
            rows.push(row);
            row = new ActionRowBuilder();
        }
    }

    if (row.components.length) rows.push(row);
    return rows;
}

function buildApprovalEmbed(request) {
    const lines = request.selected.map(key => {
        return `**${gameLabels[key]}:** ${decisionText(getDecision(request, key))}`;
    });

    return new EmbedBuilder()
        .setColor(request.status === "completed" ? "Green" : "Orange")
        .setTitle("🛡️ Verification Approval Request")
        .setDescription(`<@${request.userId}> has selected the following categories.`)
        .addFields(
            { name: "Player", value: `<@${request.userId}>`, inline: true },
            { name: "Status", value: request.status === "completed" ? "✅ Completed" : "⏳ Awaiting staff decisions", inline: true },
            { name: "Selections", value: lines.join("\n") }
        )
        .setFooter({ text: `Request ID: ${request.requestId}` });
}

async function handleVerificationButton(interaction) {
    const selected = pendingSelections.get(selectionKey(interaction));

    if (!selected?.length) {
        return interaction.reply({
            content: "❌ पहले ऊपर से कम-से-कम एक game या Content Creator select करें।",
            ephemeral: true
        });
    }

    const requestId = `${interaction.guildId}-${interaction.user.id}-${Date.now()}`;
    const request = await VerificationRequest.create({
        requestId,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        channelId: config.APPROVAL_LOG_CHANNEL_ID,
        selected
    });

    try {
        const logChannel = await interaction.client.channels.fetch(config.APPROVAL_LOG_CHANNEL_ID);
        if (!logChannel?.isTextBased()) throw new Error("Approval logs channel is not available.");

        const logMessage = await logChannel.send({
            embeds: [buildApprovalEmbed(request)],
            components: buildApprovalComponents(request)
        });

        request.messageId = logMessage.id;
        await request.save();
        pendingSelections.delete(selectionKey(interaction));

        return interaction.reply({
            content: "✅ आपकी verification request staff approval के लिए भेज दी गई है।",
            ephemeral: true
        });
    } catch (error) {
        await VerificationRequest.deleteOne({ requestId });
        console.error("VERIFICATION REQUEST FAILED:", error);
        return interaction.reply({
            content: "❌ Verification request भेजने में समस्या आई। Staff logs channel और bot permissions check करें।",
            ephemeral: true
        });
    }
}

async function handleApprovalAction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({
            content: "❌ केवल Manage Roles permission वाले staff members approval कर सकते हैं।",
            ephemeral: true
        });
    }

    const [, action, requestId, category] = interaction.customId.split(":");
    const request = await VerificationRequest.findOne({ requestId });

    if (!request || !request.selected.includes(category)) {
        return interaction.reply({ content: "❌ यह verification request नहीं मिली।", ephemeral: true });
    }

    if (getDecision(request, category)) {
        return interaction.reply({ content: "⚠️ इस category पर पहले ही decision लिया जा चुका है।", ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
    if (!member) {
        return interaction.reply({ content: "❌ यह member अब server में मौजूद नहीं है।", ephemeral: true });
    }

    const roleId = config.VERIFICATION_ROLE_IDS[category];
    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
        return interaction.reply({ content: `❌ ${gameLabels[category]} role नहीं मिला।`, ephemeral: true });
    }

    if (action === "approve") {
        await member.roles.add(role);
        request.decisions.set(category, "approved");
    } else {
        await member.roles.remove(role).catch(() => null);
        request.decisions.set(category, "rejected");
    }

    const allDecided = request.selected.every(key => getDecision(request, key));
    if (allDecided) {
        request.status = "completed";

        const unverifiedRole = await interaction.guild.roles.fetch(config.UNVERIFIED_ROLE_ID).catch(() => null);
        if (unverifiedRole) await member.roles.remove(unverifiedRole).catch(() => null);

        const memberRole = await interaction.guild.roles.fetch(config.MEMBER_ROLE_ID).catch(() => null);
        if (memberRole) await member.roles.add(memberRole).catch(() => null);
    }

    await request.save();

    await interaction.update({
        embeds: [buildApprovalEmbed(request)],
        components: buildApprovalComponents(request)
    });
}

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        try {
            if (interaction.isStringSelectMenu() && interaction.customId === "verification_games") {
                pendingSelections.set(selectionKey(interaction), interaction.values);
                return interaction.reply({
                    content: `✅ Selected: ${interaction.values.map(value => gameLabels[value]).join(", ")}`,
                    ephemeral: true
                });
            }

            if (interaction.isButton() && interaction.customId === "verify") {
                return handleVerificationButton(interaction);
            }

            if (interaction.isButton() && interaction.customId.startsWith("verification:")) {
                return handleApprovalAction(interaction);
            }

            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction);
            }
        } catch (err) {
            console.error("INTERACTION ERROR:", err);
            const message = "❌ इस interaction को process करने में समस्या आई।";

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
            } else {
                await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
            }
        }
    }
};
