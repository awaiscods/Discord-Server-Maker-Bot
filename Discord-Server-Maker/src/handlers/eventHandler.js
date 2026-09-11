// src/handlers/eventHandler.js - Auto-loads all events from /events
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  const files = readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(join(eventsPath, file)).href;
    const event = await import(filePath);

    if (!event.name || !event.execute) {
      logger.warn(`Event file ${file} missing "name" or "execute", skipping`);
      continue;
    }

    const handler = (...args) => event.execute(...args, client);

    if (event.once) {
      client.once(event.name, handler);
    } else {
      client.on(event.name, handler);
    }

    logger.info(`Loaded event: ${event.name} (once=${!!event.once})`);
  }
}
