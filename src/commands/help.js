// src/commands/help.js - /help command
import { SlashCommandBuilder } from 'discord.js';
import { buildEmbed } from '../utils/helpers.js';
import config from '../../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('📖 Show all IWA Maker commands');

export async function execute(interaction) {
  const embed = buildEmbed({
    title: '🤖 IWA Maker — Help',
    description: 'AI-powered Discord Server Builder. Invite me, run `/setup`, and watch your server come to life!',
    fields: [
      {
        name: '⚡ Commands',
        value: [
          '`/setup` — Start AI server generation (requires **Manage Server**)',
          '`/preview` — Preview the AI plan before creating anything',
          '`/regenerate` — Delete generated structure and rebuild',
          '`/delete-generated` — Remove only bot-created channels & roles',
          '`/help` — Show this message',
        ].join('\n'),
      },
      {
        name: '📌 How It Works',
        value: '1. Run `/setup`\n2. Describe your server idea\n3. Preview the plan\n4. Click **Create** to build!',
      },
      {
        name: '🔗 Invite IWA Maker',
        value: `[Click here to invite the bot](${config.inviteUrl})\nThe invite link automatically grants all required permissions.`,
      },
    ],
  });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
