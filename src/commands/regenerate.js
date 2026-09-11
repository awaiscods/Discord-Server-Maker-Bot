// src/commands/regenerate.js - /regenerate command
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getGeneration } from '../services/database.js';
import { buildEmbed } from '../utils/helpers.js';
import config from '../../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('regenerate')
  .setDescription('🔄 Delete generated structure and regenerate from scratch')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const record = getGeneration(interaction.guildId);

  if (!record) {
    return interaction.reply({
      embeds: [buildEmbed({
        title: '❌ Nothing to Regenerate',
        description: 'No previous generation found. Run `/setup` first.',
        color: config.colors.red,
      })],
      flags: 64,
    });
  }

  const totalResources = record.channelIds.length + record.categoryIds.length + record.roleIds.length;

  const embed = buildEmbed({
    title: '⚠️ Confirm Regeneration',
    description: [
      `This will **delete ${totalResources} bot-created resources** and regenerate the server using the same prompt:`,
      `> *${record.prompt}*`,
      '',
      '**This action cannot be undone.**',
    ].join('\n'),
    color: config.colors.yellow,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm_regenerate').setLabel('🔄 Regenerate').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cancel_action').setLabel('✖ Cancel').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
}
