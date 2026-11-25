const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    MessageFlags,
    AttachmentBuilder
} = require("discord.js");
const path = require("path");
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

function isPrivateSelectionPanel(interaction) {
    return Boolean(interaction.message?.flags?.has(MessageFlags.Ephemeral));
}

function buildSelectionComponents(selected = []) {
    const categories = [
        ["minecraft", "⛏️ Minecraft"],
        ["roblox", "🧱 Roblox"],
        ["bgmi", "🎯 BGMI"],
        ["valorant", "🔫 Valorant"],
        ["gta", "🚗 GTA 5"],
        ["content_creator", "🎥 Content Creator"]
    ];
    const rows = [];

    for (let index = 0; index < categories.length; index += 2) {
        const row = new ActionRowBuilder();
        for (const [key, label] of categories.slice(index, index + 2)) {
            const isSelected = selected.includes(key);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`verification:select:${key}`)
                    .setLabel(`${isSelected ? "✅" : "☐"} ${label}`)
                    .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }

    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("verify")
            .setLabel("✅ VERIFY")
            .setStyle(ButtonStyle.Success)
    ));

    return rows;
}

function selectionPanelContent(selected) {
    return "Select all your categories. Selected options will turn green.\n\nPress VERIFY only when your selection is complete.";
}

function privateVerificationEmbed() {
    return new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ SERVER VERIFICATION")
        .setDescription("Select your games or creator category, then press VERIFY.")
        .setImage("attachment://verify.png");
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
    const privatePanel = isPrivateSelectionPanel(interaction);

    if (!selected?.length) {
        const payload = {
            content: "❌ Please select at least one game or Content Creator category first.",
            ...(privatePanel
                ? { components: buildSelectionComponents([]) }
                : { ephemeral: true })
        };
        return privatePanel ? interaction.update(payload) : interaction.reply(payload);
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const memberRole = await interaction.guild.roles.fetch(config.MEMBER_ROLE_ID).catch(() => null);
    const verifiedRole = await interaction.guild.roles.fetch(config.VERIFIED_ROLE_ID).catch(() => null);
    const unverifiedRole = await interaction.guild.roles.fetch(config.UNVERIFIED_ROLE_ID).catch(() => null);

    if (!memberRole || !verifiedRole) {
        const payload = {
            content: "❌ The Verified or Member role was not found. Please ask staff to check the role configuration.",
            ...(privatePanel ? { components: buildSelectionComponents(selected) } : { ephemeral: true })
        };
        return privatePanel ? interaction.update(payload) : interaction.reply(payload);
    }

    // Basic verification happens immediately. Game/content roles still require staff approval.
    await member.roles.add([verifiedRole, memberRole]);
    if (unverifiedRole) await member.roles.remove(unverifiedRole);

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

        const payload = {
            content: "✅ Your verification request has been sent for staff approval.",
            ...(privatePanel ? { components: [] } : { ephemeral: true })
        };
        return privatePanel ? interaction.update(payload) : interaction.reply(payload);
    } catch (error) {
        await VerificationRequest.deleteOne({ requestId });
        console.error("VERIFICATION REQUEST FAILED:", error);
        const payload = {
            content: "❌ There was a problem sending the verification request. Please check the staff logs channel and bot permissions.",
            ...(privatePanel ? { components: buildSelectionComponents(selected) } : { ephemeral: true })
        };
        return privatePanel ? interaction.update(payload) : interaction.reply(payload);
    }
}

async function handleApprovalAction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({
            content: "❌ Only staff members with the Manage Roles permission can approve requests.",
            ephemeral: true
        });
    }

    const [, action, requestId, category] = interaction.customId.split(":");
    const request = await VerificationRequest.findOne({ requestId });

    if (!request || !request.selected.includes(category)) {
        return interaction.reply({ content: "❌ This verification request could not be found.", ephemeral: true });
    }

    if (getDecision(request, category)) {
        return interaction.reply({ content: "⚠️ A decision has already been made for this category.", ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
    if (!member) {
        return interaction.reply({ content: "❌ This member is no longer in the server.", ephemeral: true });
    }

    const roleId = config.VERIFICATION_ROLE_IDS[category];
    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
        return interaction.reply({ content: `❌ The ${gameLabels[category]} role was not found.`, ephemeral: true });
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
            if (interaction.isButton() && interaction.customId.startsWith("verification:select:")) {
                const category = interaction.customId.split(":")[2];
                const selected = pendingSelections.get(selectionKey(interaction)) || [];
                const nextSelection = selected.includes(category)
                    ? selected.filter(value => value !== category)
                    : [...selected, category];

                pendingSelections.set(selectionKey(interaction), nextSelection);

                const response = {
                    content: selectionPanelContent(nextSelection),
                    components: buildSelectionComponents(nextSelection)
                };

                return isPrivateSelectionPanel(interaction)
                    ? interaction.update(response)
                    : interaction.reply({
                        ...response,
                        embeds: [privateVerificationEmbed()],
                        files: [new AttachmentBuilder(path.join(__dirname, "..", "verify.png"), { name: "verify.png" })],
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
            const message = "❌ There was a problem processing this interaction.";

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
            } else {
                await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
            }
        }
    }
};
