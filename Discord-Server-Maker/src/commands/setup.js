// src/commands/setup.js - /setup command
import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('🚀 Start AI-powered server generation')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('setup_modal')
    .setTitle('🤖 IWA Maker — Server Builder');

  const ideaInput = new TextInputBuilder()
    .setCustomId('server_idea')
    .setLabel('Server Idea')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Anime Community, Gaming, Coding, Crypto...')
    .setRequired(true)
    .setMaxLength(100);

  const requirementsInput = new TextInputBuilder()
    .setCustomId('requirements')
    .setLabel('Additional Requirements (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g. Need ticket system, voice channels, verification, staff hierarchy...')
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ideaInput),
    new ActionRowBuilder().addComponents(requirementsInput)
  );

  await interaction.showModal(modal);
}
