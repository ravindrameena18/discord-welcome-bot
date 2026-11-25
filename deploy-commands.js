require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const clientId = process.env.CLIENT_ID?.trim();
const guildId = process.env.GUILD_ID?.trim();

const commands = [];

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

if (!process.env.TOKEN?.trim() || !clientId || !guildId) {
    console.warn("⚠️ Slash-command sync skipped: TOKEN, CLIENT_ID and GUILD_ID are required.");
} else {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    (async () => {
        try {
            console.log("Deploying Slash Commands...");

            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );

            console.log("✅ Slash Commands Deployed!");
        } catch (error) {
            console.error("❌ Slash-command sync failed:", error.message || error);
        }
    })();
}
