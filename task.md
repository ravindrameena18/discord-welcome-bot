# Task Tracker: GYRORISHABH Discord Bot

This document tracks all project milestones, completed implementations, active inspections, and pending fixes/enhancements.

---

## 📌 Current Tasks

- [x] Comprehensive inspection of existing project structure, commands, events, database models, configuration, and YouTube notification engine.
- [x] Security audit of configuration and environment variable handling (ensure zero secret leaks).
- [x] Creation of comprehensive project documentation:
  - [x] `README.md`
  - [x] `task.md`
  - [x] `implementation_plan.md`
  - [x] `walkthrough.md`
- [ ] Present audit findings and proposed implementation plan to the user for review before modifying any project code.

---

## ✅ Completed Tasks

- **Discord Gateway Client Setup:**
  - Configured `discord.js` v14 client with required Gateway Intents:
    - `GatewayIntentBits.Guilds`
    - `GatewayIntentBits.GuildMessages`
    - `GatewayIntentBits.MessageContent`
    - `GatewayIntentBits.GuildMembers` (privileged)
    - `GatewayIntentBits.GuildVoiceStates`
  - Initialized dynamic slash command loader (`commands/`).
  - Initialized dynamic event listener loader (`events/`).

- **Slash Commands Implemented:**
  - `/ping`: Latency check command responding with "🏓 Pong!".
  - `/userinfo`: Detailed user information embed with avatar, tag, user ID, server join date, and account creation timestamp.
  - `/setupverify`: Administrator panel dispatcher creating the verification message and button.
  - `/help`: Information embed listing bot commands.

- **Member Onboarding Events:**
  - Private DM welcome system (`events/guildMemberAdd.js`) with an embed and interactive link buttons (Verify, YouTube, Instagram).
  - Public channel welcome system (`events/memberJoin.js`) with a customized server embed, user avatar, and member counter.
  - Auto-role assignment granting initial unverified role upon joining.

- **Role Verification System:**
  - Verification embed panel with interactive button (`verify`).
  - Verification logic in `events/interactionCreate.js` granting verified member role and removing unverified role.
  - Standalone verification handler created in `buttons/verify.js` (pending dynamic loader integration).

- **Database & Storage Integration:**
  - MongoDB connection handler via Mongoose (`database/mongoose.js`).
  - `YouTubeVideo` Mongoose schema (`models/YouTubeVideo.js`) to record published video IDs.

- **YouTube Poller:**
  - Polling loop in `youtube/youtubeNotifier.js` querying YouTube Data API v3 for latest uploads and dispatching server announcements to `YOUTUBE_NOTIFICATION_CHANNEL_ID`.

---

## ⏳ Pending Deployment, Fixes & Improvements

- [x] **Package.json Scripts & Engine Specification:**
  - Added `"start": "node index.js"` script to `package.json` for hosting providers like Render.
- [x] **Render Free Hosting Keep-Alive Server:**
  - Integrated Express HTTP server in `index.js` listening on `0.0.0.0` and `process.env.PORT || 3000` with `GET /` route returning `"Discord Bot is running!"` to satisfy Render port detection.
- [x] **YouTube API Environment Variable Validation & Error Handling:**
  - Safely reads `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` from environment variables, preventing unregistered 403 API errors on Render.
- [x] **Add `.env.example` Template:**
  - Added a sanitized template file in the repository root for safe collaboration and onboarding.
- [ ] **Deduplicate `guildMemberAdd` Event Handlers:**
  - Currently both `events/guildMemberAdd.js` and `events/memberJoin.js` register listeners for `guildMemberAdd`.
  - Consolidate into a clean, unified flow or clearly distinguish modules to prevent racing conditions and cluttered event lists.
- [ ] **Fix Duplicate Ready Event Execution:**
  - `events/ready.js` handles `clientReady`, and `index.js` independently registers `client.once("clientReady")`.
  - Consolidate startup routines (status logging and YouTube poller startup) into a single clean handler.
- [ ] **Reconcile Verification Button Handling:**
  - `buttons/verify.js` uses IDs from `config.json`, while `events/interactionCreate.js` has a hardcoded inline handler checking role names as raw strings (`"verified"`, `"Member"`, `"Unverified"`).
  - Connect dynamic button loading or standardize role lookup using `config.json` IDs to avoid broken verifications when role names change.
- [ ] **Resolve YouTube API Quota Exhaustion:**
  - The current 60s polling against `search.list` consumes 100 quota units per call (144,000 units/day vs 10,000 free daily limit).
  - Optimize using either:
    1. YouTube XML/RSS feed (`https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`) which consumes 0 quota units.
    2. Switching from `search.list` (100 units) to channel playlist `playlistItems.list` (1 unit per call) and adjusting the interval.
- [ ] **Fix YouTube First-Boot Loop Bug:**
  - In `youtube/youtubeNotifier.js`, `lastVideoId` is an in-memory string. When the bot restarts, it skips video 1, but processes videos 2 and 3 if not in MongoDB, causing legacy videos to be announced.
  - Update poller to initialize existing videos properly from database or API on startup.
- [ ] **Synchronize Slash Commands in `/help`:**
  - Update `commands/help.js` to dynamically show all registered commands or explicitly include `/setupverify` and `/userinfo`.

