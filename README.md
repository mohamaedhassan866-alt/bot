# Djexo PvP Discord Bot — Fresh Build

A fresh Discord.js v14 bot for a MTA: San Andreas community. It is not based on the previous bot project.

## Included
- Ticket panel with 7 types: General question, VIP purchase, Partner, High-rank request, Compensation, Technical support, and Complaints.
- Each ticket type has its own modal questions and its own Discord Category ID setting.
- Ticket channel is private to the requester, and optionally the support role.
- Claim and close buttons, duplicate-open-ticket prevention per type, JSON ticket state, optional log channel.
- Slash commands: `/setup`, `/mta-status`, `/ticket-close`, `/ticket-claim`, `/announce`, `/dm-all`, `/report`, `/pvp-points`, `/pvp-add`, `/pvp-top`, `/warn`, `/kick`, `/ban`.
- `/dm-all` sends a confirmed private message to non-bot members, with pacing and a summary of sent/failed messages. Discord privacy settings may block some DMs.
- `/report` sends a member report to `REPORTS_CHANNEL_ID`.
- PVP points are stored locally in `data/pvp-points.json`; members can check points and view the leaderboard, while staff can add or subtract points.
- Optional MTA server status lookup (online/offline, player count, max players, map) using host and port settings.
- Uses `Guilds` and `GuildMembers` gateway intents. Enable **Server Members Intent** in Discord Developer Portal → Bot to support `/dm-all`.

## Requirements
- Node.js 20 or newer
- A Discord application/bot and the bot invited to your server
- Bot permissions: View Channels, Send Messages, Embed Links, Read Message History, Manage Channels, and (for moderation commands) Kick Members and Ban Members. The bot role must be above roles it needs to moderate.

## Install on Windows
1. Extract the ZIP into a new folder.
2. Copy `.env.example` to `.env`.
3. Fill `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
4. Fill each `CATEGORY_*` with the ID of a **Discord Category**, not a text channel. You can use separate categories for every type, including `CATEGORY_STAFF_APPLICATION` for **تقديمات الإدارة**.
5. Optionally fill `SUPPORT_ROLE_ID`, `LOGS_CHANNEL_ID`, `REPORTS_CHANNEL_ID`, and MTA host/port.
6. Open CMD in the folder and run:

```bat
npm install
npm run deploy
npm start
```

7. Run `/setup` in the text channel where you want the ticket panel posted.

## Getting IDs
Enable Discord Developer Mode under User Settings → Advanced. Right-click a role, channel, category, or server and select Copy ID.

## MTA status
Set `MTA_HOST` and `MTA_PORT` to the server's query host and port. The server must be reachable from the machine running the bot, and firewall/query settings must permit status requests. `/mta-status` checks the server on demand. To auto-post status, set `STATUS_CHANNEL_ID`; the bot will create a status message with the fixed `assets/server-off.png` image and edit that same message every `STATUS_UPDATE_MINUTES` minutes. The message ID is saved in `data/status-message.json`, so restarts do not create a new message unless the old message was deleted or is inaccessible.

## Important notes
- Never share `.env` or your bot token. If the token is exposed, reset it in Developer Portal.
- Ticket categories must already exist and the bot must have permission to create channels in them.
- `OWNER_ROLE_ID`, `ADMIN_ROLE_ID`, `MOD_ROLE_ID`, and `SUPPORT_ROLE_ID` are optional role IDs used for staff-only ticket actions. Leave them blank if you want Discord Administrator permission to be the only staff permission.
- Slash commands are deployed to the configured guild for fast updates. Re-run `npm run deploy` after changing commands.
- This package has been syntax-checked locally, but has not been connected to or tested against your real Discord or MTA server. MTA status depends on the actual server query settings.
- `/warn` currently sends a DM and logs the warning, but does not maintain a permanent warning count. Ticket state and PVP points are stored locally in JSON files.
