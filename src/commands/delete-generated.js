// src/commands/delete-generated.js - /delete-generated command
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
  .setName('delete-generated')
  .setDescription('🗑️ Delete only bot-created channels and roles')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const record = getGeneration(interaction.guildId);

  if (!record) {
    return interaction.reply({
      embeds: [buildEmbed({
        title: '❌ Nothing to Delete',
        description: 'No bot-generated resources found for this server.',
        color: config.colors.red,
      })],
      flags: 64,
    });
  }

  const embed = buildEmbed({
    title: '🗑️ Confirm Deletion',
    description: [
      `This will permanently delete **${record.channelIds.length} channels**, **${record.categoryIds.length} categories**, and **${record.roleIds.length} roles** created by IWA Maker.`,
      '',
      '**Existing channels and roles will NOT be touched.**',
      '**This action cannot be undone.**',
    ].join('\n'),
    color: config.colors.red,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm_delete').setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cancel_action').setLabel('✖ Cancel').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
}
