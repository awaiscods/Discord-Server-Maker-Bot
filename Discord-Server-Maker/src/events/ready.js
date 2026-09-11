// src/events/ready.js - Bot ready event
import { logger } from '../utils/logger.js';

export const name = 'clientReady';
export const once = true;

export function execute(client) {
  logger.info(`✅ IWA Maker is online as ${client.user.tag}`);
  client.user.setActivity({ name: '🤖 Building servers with AI', type: 3 }); // WATCHING
}
