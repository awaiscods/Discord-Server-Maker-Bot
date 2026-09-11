// index.js - IWA Maker entry point
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { loadCommands } from './src/handlers/commandHandler.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { initDatabase } from './src/services/database.js';
import { logger } from './src/utils/logger.js';
import config from './config/config.js';

// Validate required env vars
const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GEMINI_API_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

async function main() {
  await initDatabase();
  await loadCommands(client);
  await loadEvents(client);
  await client.login(config.token);
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down IWA Maker...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', err?.message ?? err);
  // Do not crash the process on unhandled rejections
});

main().catch((err) => {
  logger.error('Fatal startup error', err.message);
  process.exit(1);
});
