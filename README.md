# GYRORISHABH Discord Welcome & Community Bot

A full-featured Discord community bot built with [Discord.js v14](https://discord.js.org/) and Node.js. It provides automated member greetings, direct message onboarding, server auto-roles, self-verification buttons, moderation utility commands, and automatic YouTube video upload notifications backed by MongoDB.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Folder Structure](#-folder-structure)
- [Prerequisites](#-prerequisites)
- [Discord Bot Setup](#-discord-bot-setup)
- [MongoDB Setup](#-mongodb-setup)
- [YouTube API Setup](#-youtube-api-setup)
- [Environment Variables](#-environment-variables)
- [Configuration File](#-configuration-file)
- [Local Installation & Running](#-local-installation--running)
- [Deploying Slash Commands](#-deploying-slash-commands)
- [Deploying on Render](#-deploying-on-render)
- [Troubleshooting & Common Issues](#-troubleshooting--common-issues)

---

## ✨ Features

- **Automated Member Onboarding:**
  - **Server Welcome Channel:** Posts a rich welcome embed with member avatar, server member count, and important channel bookmarks when a new user joins.
  - **Direct Message (DM) Greeting:** Automatically sends the newcomer a direct message with an overview of the server, quick-start guide, and clickable link buttons (Server invite, YouTube, Instagram).
  - **Auto-Role:** Automatically grants a default role (such as `Unverified`) when a member joins.
- **Interactive Verification System:**
  - `/setupverify` command posts a persistent verification panel with a green button.
  - Clicking the button verifies the user, assigns the verified member role, and strips the unverified role.
- **Automated YouTube Upload Notifications:**
  - Periodically polls the YouTube channel for new video uploads.
  - Prevents duplicate alerts by persisting announced video IDs in MongoDB.
  - Automatically posts an announcement with `@everyone` mention and video preview in the configured alerts channel.
- **Utility Slash Commands:**
  - `/ping`: Check bot response latency and connection status.
  - `/userinfo`: Display detailed information about a user (avatar, ID, join date, account creation date).
  - `/help`: Quick command overview for server members.
  - `/setupverify`: Administrator command to deploy the verification panel in any channel.

---

## 🛠 Architecture & Tech Stack

- **Runtime:** Node.js (v18.x or v20.x recommended)
- **Library:** [discord.js v14](https://discord.js.org/)
- **Database:** [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **API:** Google YouTube Data API v3

---

## 📁 Folder Structure

```text
Discord welcome MSG/
├── buttons/
│   └── verify.js               # Standalone verify button interaction handler
├── commands/
│   ├── help.js                 # /help slash command
│   ├── ping.js                 # /ping slash command
│   ├── setupverify.js          # /setupverify slash command (deploys verify panel)
│   └── userinfo.js             # /userinfo slash command (lookup user metadata)
├── config/
│   └── config.json             # Channel snowflakes and role IDs
├── database/
│   └── mongoose.js             # MongoDB connection initialization
├── events/
│   ├── guildMemberAdd.js       # Handles join DM notification with link buttons
│   ├── interactionCreate.js    # Routes slash commands and button clicks
│   ├── memberJoin.js           # Handles server welcome embed and auto-role
│   └── ready.js                # Bot ready event listener
├── models/
│   └── YouTubeVideo.js         # Mongoose schema for announced YouTube videos
├── youtube/
│   └── youtubeNotifier.js      # YouTube poller and announcement dispatcher
├── .env                        # Private environment variables (git-ignored)
├── .env.example                # Example environment variable template
├── .gitignore                  # Git ignore rules
├── deploy-commands.js          # Script to register slash commands with Discord REST API
├── index.js                    # Bot entry point and event/command loader
├── package.json                # Project dependencies and npm scripts
├── README.md                   # Project documentation
├── task.md                     # Project task tracker
├── implementation_plan.md      # Architecture refactoring plan
└── walkthrough.md              # Workflow and operational walkthrough
```

---

## ⚙ Prerequisites

Before running or deploying the bot, ensure you have:
1. **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/)).
2. **Discord Account & Server**: With "Manage Server" or Administrator permissions.
3. **Discord Developer Application**: A registered bot application on the Discord Developer Portal.
4. **MongoDB Database**: Free MongoDB Atlas cluster or local MongoDB instance.
5. **Google Cloud Console Account**: For YouTube Data API v3 credentials.

---

## 🤖 Discord Bot Setup

1. **Create an Application:**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
   - Click **New Application** and enter a name (e.g. `GYRO Bot`).
2. **Create Bot User:**
   - Navigate to the **Bot** tab on the left sidebar.
   - Click **Add Bot**.
   - Under the bot username, click **Reset Token** and copy your bot token. Store this securely for the `TOKEN` variable.
3. **Enable Privileged Gateway Intents (CRITICAL):**
   - In the **Bot** tab, scroll down to **Privileged Gateway Intents**.
   - Enable **Server Members Intent** (required for `guildMemberAdd` event, member counts, and auto-roles).
   - Enable **Message Content Intent** (required if reading messages or mentions).
   - Click **Save Changes**.
4. **Retrieve Client ID & Guild ID:**
   - In the Developer Portal, go to **General Information** and copy the **Application ID** (`CLIENT_ID`).
   - In Discord, enable Developer Mode (*User Settings* -> *Advanced* -> *Developer Mode*).
   - Right-click your Discord server's icon and click **Copy Server ID** (`GUILD_ID`).
5. **Invite Bot to Server:**
   - In Developer Portal, go to **OAuth2** -> **URL Generator**.
   - Select scopes: `bot`, `applications.commands`.
   - Select permissions: `Administrator` (or granular permissions: *Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History, Mention Everyone*).
   - Copy the generated URL, open it in your browser, and authorize it for your server.
6. **Role Hierarchy Check:**
   - In Discord Server Settings -> **Roles**, ensure the bot's role is positioned **higher** than the roles it needs to assign (e.g. `Member` and `Unverified`). If the bot's role is below them, Discord will deny permission to assign or remove roles.

---

## 🍃 MongoDB Setup

1. Sign up or log in at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (M0 sandbox).
3. Under **Database Access**, create a database user with username and password (e.g., `botuser`). Set permissions to "Read and write to any database".
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere (`0.0.0.0/0`)** so your local machine and cloud hosts (Render) can connect.
5. Go to **Clusters** -> click **Connect** -> choose **Drivers** (Node.js).
6. Copy the connection string. Replace `<db_password>` with your database user password and specify a database name:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/discord_bot?retryWrites=true&w=majority
   ```
   Save this as `MONGODB_URI`.

---

## 📺 YouTube API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Go to **APIs & Services** -> **Library**.
4. Search for **YouTube Data API v3** and click **Enable**.
5. Go to **APIs & Services** -> **Credentials**.
6. Click **Create Credentials** -> **API Key**.
7. Copy the generated key. (Optional but recommended: Restrict the API key to "YouTube Data API v3").
8. Save this key as `YOUTUBE_API_KEY`.
9. **Find your YouTube Channel ID (`YOUTUBE_CHANNEL_ID`):**
   - Open YouTube and navigate to the target channel.
   - If the URL looks like `youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx`, `UCxxxxxxxxxxxxxxxxxxxxxx` is your Channel ID.
   - If the URL has a handle (e.g. `youtube.com/@GYRORISHABH`), view the page source (`Ctrl+U`), search for `browse_id` or `channelId`, or use a free online YouTube Channel ID finder.

---

## 🔐 Environment Variables

Create a file named `.env` in the root folder of the project. **Never share or commit this file.**

```env
# Discord Bot Credentials
TOKEN=your_bot_token_here
CLIENT_ID=your_discord_application_id_here
GUILD_ID=your_target_discord_server_id_here

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.abcde.mongodb.net/discord_bot?retryWrites=true&w=majority

# YouTube API Configuration
YOUTUBE_API_KEY=your_google_cloud_youtube_api_key_here
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxx
```

### Environment Variable Explanations

| Variable | Description |
|---|---|
| `TOKEN` | Discord Bot secret token used for gateway connection and authorization. |
| `CLIENT_ID` | Discord Application ID used for deploying slash commands. |
| `GUILD_ID` | Discord Server ID where guild slash commands are registered instantly. |
| `MONGODB_URI` | MongoDB connection URI used by Mongoose. |
| `YOUTUBE_API_KEY` | Google API key with YouTube Data API v3 enabled. |
| `YOUTUBE_CHANNEL_ID` | 24-character YouTube Channel ID to monitor for new video uploads. |

---

## 📝 Configuration File

The `config/config.json` file contains Discord snowflake IDs for server roles and channels:

```json
{
  "WELCOME_CHANNEL_ID": "1517417811792760903",
  "AUTO_ROLE_ID": "1517399367546437744",
  "MEMBER_ROLE_ID": "1534125683976962118",
  "UNVERIFIED_ROLE_ID": "1517399367546437744",
  "VERIFY_CHANNEL_ID": "1517417840737517631",
  "YOUTUBE_NOTIFICATION_CHANNEL_ID": "1517417805744574505"
}
```

- `WELCOME_CHANNEL_ID`: Channel where welcome cards/messages are sent.
- `AUTO_ROLE_ID`: Role added when a member joins the server.
- `MEMBER_ROLE_ID`: Verified member role assigned upon clicking verify.
- `UNVERIFIED_ROLE_ID`: Unverified role removed upon clicking verify.
- `VERIFY_CHANNEL_ID`: Channel designated for the verification prompt.
- `YOUTUBE_NOTIFICATION_CHANNEL_ID`: Channel where YouTube upload announcements are sent.

---

## 🚀 Local Installation & Running

1. **Clone repository:**
   ```bash
   git clone https://github.com/ravindrameena18/discord-welcome-bot.git
   cd discord-welcome-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create `.env` following the [Environment Variables](#-environment-variables) section and customize `config/config.json` with your server's IDs.

4. **Register Slash Commands:**
   ```bash
   node deploy-commands.js
   ```

5. **Start Bot:**
   ```bash
   node index.js
   ```

---

## 📡 Deploying Slash Commands

Whenever you add, modify, or delete commands in the `commands/` directory, register them with Discord by running:

```bash
node deploy-commands.js
```

This updates guild-specific slash commands instantly for the server specified by `GUILD_ID`.

---

## ☁ Deploying on Render

[Render](https://render.com/) allows running Node.js services. You can deploy this bot using one of two methods:

### Method A: Web Service (Free Tier)

Render's Free Tier offers **Web Services**, which expect an active HTTP server that listens on a port (`process.env.PORT`). If the service does not bind to an HTTP port, Render marks the deployment as failed.

1. **Ensure HTTP Keep-Alive is configured:**
   The project can include a minimal Express ping server in `index.js`:
   ```javascript
   const express = require("express");
   const app = express();
   const PORT = process.env.PORT || 3000;
   app.get("/", (req, res) => res.send("Bot is online!"));
   app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));
   ```
2. **Push your code to GitHub.**
3. **Log into Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com/).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.
4. **Configure Service:**
   - **Name:** `gyro-discord-bot`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js` (or `npm start`)
   - **Plan:** Free
5. **Add Environment Variables:**
   Under **Environment Variables**, add:
   - `TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `MONGODB_URI`
   - `YOUTUBE_API_KEY`
   - `YOUTUBE_CHANNEL_ID`
6. **Prevent Sleep (Render Free Web Services):**
   Render free web services sleep after 15 minutes of inbound HTTP inactivity. To keep your Discord bot connected:
   - Use a free uptime monitoring service like [UptimeRobot](https://uptimerobot.com/) or [Cron-Job.org](https://cron-job.org/).
   - Point an HTTP monitor to your Render service URL (`https://your-service-name.onrender.com/`) every 5 to 10 minutes.

### Method B: Background Worker (Paid Plan)

If using a paid Render plan, you can select **Background Worker**. Background Workers run continuously in the background without needing an open HTTP port or uptime pings.

---

## ❓ Troubleshooting & Common Issues

- **`Used disallowed intents` error:**
  Go to the Discord Developer Portal -> Bot -> enable **Server Members Intent** and **Message Content Intent**.
- **`Missing Permissions` when assigning roles:**
  The bot's role in Discord Server Settings -> Roles must be higher than the role it is trying to assign or remove.
- **Commands not appearing in Discord:**
  Run `node deploy-commands.js`. Note that guild commands update instantly, whereas global commands can take up to an hour to cache.
- **YouTube API quota error (`quotaExceeded` / 403):**
  The YouTube Data API free tier provides 10,000 units per day. The search endpoint costs 100 units per call. Polling every 60 seconds consumes 144,000 units/day. See `implementation_plan.md` for recommended optimizations (e.g. RSS feed polling or `playlistItems` API).
- **Direct message not delivered:**
  The user may have server DMs turned off in their Discord privacy settings. The bot safely catches this error and logs it in the console without crashing.
