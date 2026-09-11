// src/commands/preview.js - /preview command
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getGeneration } from '../services/database.js';
import { buildEmbed } from '../utils/helpers.js';
import config from '../../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('👁️ Preview the last AI-generated server plan')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const record = getGeneration(interaction.guildId);

  if (!record?.plan) {
    return interaction.reply({
      embeds: [buildEmbed({
        title: '❌ No Plan Found',
        description: 'No server plan exists yet. Run `/setup` to generate one.',
        color: config.colors.red,
      })],
      flags: 64,
    });
  }

  const { plan } = record;

  const rolesText = plan.roles.map((r) => `• **${r.name}** — ${r.color ?? 'default'}`).join('\n') || 'None';
  const categoriesText = plan.categories.map((c) => {
    const channels = c.channels.map((ch) => `  ${ch.type === 'voice' ? '🔊' : '💬'} ${ch.name}`).join('\n');
    return `**${c.name}**\n${channels}`;
  }).join('\n\n') || 'None';

  const embed = buildEmbed({
    title: `👁️ Preview: ${plan.name ?? 'Server Plan'}`,
    description: `Generated on <t:${Math.floor(new Date(record.createdAt).getTime() / 1000)}:R>\nPrompt: *${record.prompt}*`,
    fields: [
      { name: '🎭 Roles', value: rolesText.slice(0, 1024), inline: false },
      { name: '📁 Categories & Channels', value: categoriesText.slice(0, 1024), inline: false },
    ],
  });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
