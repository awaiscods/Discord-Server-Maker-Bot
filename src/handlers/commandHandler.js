// src/handlers/commandHandler.js - Auto-loads all commands from /commands
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection } from 'discord.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = join(__dirname, '..', 'commands');
  const files = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(join(commandsPath, file)).href;
    const command = await import(filePath);

    if (!command.data || !command.execute) {
      logger.warn(`Command file ${file} is missing "data" or "execute" export, skipping`);
      continue;
    }

    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: /${command.data.name}`);
  }
}
