# Discord-Server-Maker-Bot
Create fully customized Discord servers in seconds with a simple bot.





# 🤖 IWA Maker — AI-Powered Discord Server Builder

IWA Maker uses Google Gemini AI to design and build a complete Discord server structure — roles, categories, channels, and permissions — from a single prompt.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Install
```bash
cd iwa-maker
npm install
```

### 3. Configure
```bash
cp .env.example .env
```
Edit `.env`:
```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Deploy Slash Commands
```bash
npm run deploy
```

### 5. Start the Bot
```bash
npm start
# or for development with auto-restart:
npm run dev
```

---

## 🔐 Required Bot Permissions

When inviting the bot, grant these permissions (or use **Administrator** for simplicity):
- Manage Channels
- Manage Roles
- Manage Guild

**OAuth2 Invite Scopes:** `bot`, `applications.commands`

---

## 📋 Commands

| Command | Description | Permission |
|---|---|---|
| `/setup` | Start AI server generation via modal | Manage Server |
| `/preview` | View the last AI-generated plan | Manage Server |
| `/regenerate` | Delete & rebuild the generated structure | Manage Server |
| `/delete-generated` | Remove only bot-created resources | Manage Server |
| `/help` | Show all commands | Everyone |

---

## 🔄 Setup Flow

1. Run `/setup`
2. Fill in the modal:
   - **Server Idea**: e.g. `Anime Community`, `Gaming`, `Crypto`
   - **Additional Requirements**: e.g. `Need ticket system, voice channels, staff hierarchy`
3. Review the AI-generated plan
4. Click **✅ Create** to build the server

---

## 📁 Project Structure

```
iwa-maker/
├── index.js                    # Entry point
├── config/
│   └── config.js               # Central config
├── src/
│   ├── commands/
│   │   ├── setup.js            # /setup command
│   │   ├── help.js             # /help command
│   │   ├── preview.js          # /preview command
│   │   ├── regenerate.js       # /regenerate command
│   │   └── delete-generated.js # /delete-generated command
│   ├── events/
│   │   ├── ready.js            # Bot ready event
│   │   └── interactionCreate.js# All interaction handling
│   ├── handlers/
│   │   ├── commandHandler.js   # Auto-loads commands
│   │   ├── eventHandler.js     # Auto-loads events
│   │   └── deployCommands.js   # Registers slash commands
│   ├── services/
│   │   ├── gemini.js           # Google Gemini AI service
│   │   ├── builder.js          # Discord server builder
│   │   └── database.js         # Persistent JSON storage
│   └── utils/
│       ├── logger.js           # Structured logger
│       └── helpers.js          # Shared utilities
├── data/
│   └── db.json                 # Auto-created at runtime
├── .env                        # Your secrets (never commit)
├── .env.example                # Template
└── package.json
```

---

## 🛡️ Safety Features

- Never deletes existing channels/roles unless user explicitly confirms
- Skips duplicate role/channel names
- Retries failed Discord API calls (up to 3x with backoff)
- Respects Discord rate limits with configurable delays
- All destructive actions require confirmation buttons
- Only users with **Manage Server** can run setup commands
- Bot checks its own permissions before attempting any creation

---

## 📊 Progress Tracking

The bot sends live progress updates during build:
```
██░░░░░░░░ 10%  🎭 Creating roles...
████░░░░░░ 35%  📁 Creating categories...
███████░░░ 60%  💬 Creating channels...
█████████░ 85%  🔒 Applying permissions...
██████████ 100% ✅ Server completed!
```
