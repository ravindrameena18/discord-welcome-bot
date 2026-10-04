# Implementation Plan: Architecture Refactoring & Production Hardening

This document outlines the proposed changes to stabilize, optimize, and prepare the GYRORISHABH Discord Bot for 24/7 cloud hosting on Render.

> [!IMPORTANT]
> In accordance with instructions, **no existing code has been altered yet**. This plan serves as the architectural blueprint for the next phase.

---

## 🎯 Summary of Planned Changes

1. **Deploy Readiness for Render (Free Web Service / Worker):**
   - Add `"start": "node index.js"` in `package.json`.
   - Provide an optional Express health-check HTTP server binding to `process.env.PORT` to satisfy Render Web Service health-checks.
2. **Event Architecture Consolidation:**
   - Eliminate dual listener collisions on `guildMemberAdd` across `events/guildMemberAdd.js` and `events/memberJoin.js`.
   - Eliminate dual `clientReady` listener duplication between `index.js` and `events/ready.js`.
3. **Button Interaction Standardization:**
   - Connect the dynamic button handler so `buttons/verify.js` executes via `events/interactionCreate.js`.
   - Replace brittle string-name role matching (`role.name === "Member"`) with reliable ID lookups from `config/config.json`.
4. **YouTube Notifier Quota & Startup Optimization:**
   - Overcome the YouTube API 10,000 units/day quota exhaustion (currently 144,000 units/day).
   - Fix the cold-start looping bug in `youtube/youtubeNotifier.js` where older videos could be announced on restart.
5. **Command & Configuration Maintenance:**
   - Update `/help` command to list all slash commands (`/ping`, `/userinfo`, `/setupverify`, `/help`).
   - Create `.env.example` with sanitized placeholders.

---

## 📂 Files That Need to Be Modified & Rationale

| File Path | Nature of Change | Why Each Change is Required |
|---|---|---|
| `package.json` | Add `"start": "node index.js"` script | Cloud platforms like Render execute `npm start` by default. Without a `start` script, deployments fail on startup. |
| `index.js` | Add Express HTTP server & clean ready handler | Render Free Web Services require an active HTTP listener on `process.env.PORT`. Removing the duplicate `clientReady` listener in `index.js` prevents duplicate log output and consolidates startup hooks in `events/ready.js`. |
| `events/ready.js` | Trigger `youtubeNotifier(client)` | Ensures a single source of truth for bot initialization actions instead of splitting ready tasks between `index.js` and `events/ready.js`. |
| `events/interactionCreate.js` & `buttons/verify.js` | Unify button handling | Currently, `buttons/verify.js` is never loaded. `events/interactionCreate.js` uses fragile role name comparisons (`role.name === "Member"`). Modifying `interactionCreate.js` to dispatch to button collections or reference `config.json` IDs ensures reliable verification even if role names are modified. |
| `events/guildMemberAdd.js` & `events/memberJoin.js` | Consolidate or streamline join logic | Having two separate files listening to `guildMemberAdd` creates race conditions, maintenance confusion, and scattered logic (one file handles DMs, the other handles channel embeds and roles). Merging them into a single clean pipeline or a cohesive module guarantees consistent execution order. |
| `youtube/youtubeNotifier.js` | Quota & cold-start bug fix | 1. **Quota Issue:** The search endpoint (`/search`) costs 100 units per call. Polling every 60 seconds burns 144,000 units/day, which crashes the service once the 10,000 unit daily limit is reached. Switching to RSS feed parsing (0 units) or `playlistItems` (1 unit) ensures 24/7 uptime without hitting quota limits.<br>2. **Cold-start bug:** On reboot, setting `lastVideoId` on item 1 while continuing the loop can lead to announcing items 2 and 3 if not yet saved in MongoDB. The startup check needs to prime the database without posting false notifications. |
| `commands/help.js` | Add `/userinfo` and `/setupverify` commands | Ensure user and admin documentation displayed in Discord accurately reflects all active slash commands. |
| `.env.example` | Create new template file | Allows new developers or cloud setup tools to know the required environment keys without exposing secrets. |

---

## 🛠 Proposed Phased Implementation

### Phase 1: Environment & Cloud Readiness (Render)
- Modify `package.json` to define `npm start`.
- Create `.env.example` with dummy values.
- Add lightweight HTTP server in `index.js` (Express is already in `dependencies`):
  ```javascript
  const express = require("express");
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.get("/", (req, res) => res.status(200).send("GYRORISHABH Bot is running!"));
  app.listen(PORT, () => console.log(`🌐 HTTP health server listening on port ${PORT}`));
  ```

### Phase 2: Event Listener & Button Handler Cleanup
- Consolidate `guildMemberAdd`:
  - Step 1: Assign auto-role (`config.AUTO_ROLE_ID`).
  - Step 2: Send server welcome embed to `config.WELCOME_CHANNEL_ID`.
  - Step 3: Attempt DM delivery in a protected `try/catch` block.
- Standardize `interactionCreate`:
  - Dynamically load button handlers from `buttons/` into `client.buttons = new Collection()`.
  - In `interactionCreate.js`, execute `client.buttons.get(interaction.customId)`.
  - Ensure `buttons/verify.js` uses `config.MEMBER_ROLE_ID` and `config.UNVERIFIED_ROLE_ID`.

### Phase 3: YouTube Notifier Resiliency & Quota Fix
- Implement YouTube XML RSS polling (`https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`) with an XML parser or axios/cheerio, OR use YouTube Data API's `playlistItems.list` on the channel's uploads playlist (`UU...` replacing `UC...` which costs only 1 quota unit instead of 100).
- Update cold-start logic: On initialization, query the latest video and store it in MongoDB if the collection is empty, without triggering an announcement for pre-existing videos.

### Phase 4: Commands Verification & Testing
- Update `commands/help.js` fields.
- Test slash command registration (`node deploy-commands.js`).
- Verify bot starts cleanly without duplicate event warnings.
