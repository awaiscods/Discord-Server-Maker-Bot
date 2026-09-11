// src/handlers/deployCommands.js - Register slash commands with Discord API
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import 'dotenv/config';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function deploy() {
  const commands = [];
  const commandsPath = join(__dirname, '..', 'commands');
  const files = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(join(commandsPath, file)).href;
    const command = await import(filePath);
    if (command.data) {
      commands.push(command.data.toJSON());
      logger.info(`Queued command: /${command.data.name}`);
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  logger.info(`Deploying ${commands.length} slash commands...`);

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

  logger.info('✅ All slash commands deployed successfully!');
}

deploy().catch((err) => {
  logger.error('Deploy failed', err.message);
  process.exit(1);
});
