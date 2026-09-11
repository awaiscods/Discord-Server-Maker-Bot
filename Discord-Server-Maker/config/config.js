// config/config.js - Central configuration
import 'dotenv/config';

export default {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  geminiApiKey: process.env.GEMINI_API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info',

  colors: {
    blurple: 0x5865f2,
    green: 0x57f287,
    red: 0xed4245,
    yellow: 0xfee75c,
    white: 0xffffff,
  },

  // Rate limit delays (ms) to respect Discord API
  rateLimits: {
    roleCreate: 1000,
    categoryCreate: 500,
    channelCreate: 500,
    permissionSet: 300,
  },

  // Max retries for failed Discord API calls
  maxRetries: 3,
  retryDelay: 2000,

  // Invite link permissions:
  // Administrator = 8
  // Manage Guild + Manage Channels + Manage Roles = 268438544
  // Using Administrator (8) so bot always has full access
  get inviteUrl() {
    return `https://discord.com/oauth2/authorize?client_id=${this.clientId}&permissions=8&scope=bot+applications.commands`;
  },
};
