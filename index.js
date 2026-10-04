require("dotenv").config();

// Express HTTP Server (Required for Render Web Service port detection)
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Discord Bot is running!");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web server running on http://0.0.0.0:${PORT}`);
});

const connectDB = require("./database/mongoose");
connectDB();

const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// Load Events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// YouTube Notifier
const youtubeNotifier = require("./youtube/youtubeNotifier");

client.once("clientReady", () => {
    console.log(`✅ ${client.user.tag} is online!`);

    youtubeNotifier(client);
});

client.login(process.env.TOKEN);