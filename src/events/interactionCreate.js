// src/events/interactionCreate.js - Central interaction router
import {
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { generateServerStructure } from '../services/gemini.js';
import { buildServerStructure, deleteGeneratedResources } from '../services/builder.js';
import { saveGeneration, getGeneration, deleteGeneration } from '../services/database.js';
import { buildEmbed, buildProgressEmbed } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import config from '../../config/config.js';

export const name = 'interactionCreate';
export const once = false;

const REQUIRED_BOT_PERMS = [
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageGuild,
];

export async function execute(interaction, client) {
  try {
    if (interaction.isChatInputCommand()) return handleCommand(interaction, client);
    if (interaction.isModalSubmit()) return handleModal(interaction, client);
    if (interaction.isButton()) return handleButton(interaction, client);
  } catch (err) {
    // Ignore expired interaction errors (10062)
    if (err?.code === 10062) return;
    logger.error('Unhandled interaction error', err.message);
    const errEmbed = buildEmbed({ title: '❌ Unexpected Error', description: err.message, color: config.colors.red });
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errEmbed], flags: 64 }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errEmbed], flags: 64 }).catch(() => {});
    }
  }
}

// ─── Command Router ───────────────────────────────────────────────────────────
async function handleCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  logger.info(`Command /${interaction.commandName} by ${interaction.user.tag} in guild ${interaction.guildId}`);
  await command.execute(interaction);
}

// ─── Modal: setup_modal ───────────────────────────────────────────────────────
async function handleModal(interaction, client) {
  if (interaction.customId !== 'setup_modal') return;

  const serverIdea = interaction.fields.getTextInputValue('server_idea').trim();
  const requirements = interaction.fields.getTextInputValue('requirements').trim();

  // Check bot permissions using appPermissions — always available on interactions
  const botPerms = interaction.appPermissions;
  if (botPerms) {
    const missingPerms = REQUIRED_BOT_PERMS.filter((p) => !botPerms.has(p));
    if (missingPerms.length > 0) {
      const names = missingPerms.map((p) =>
        `\`${Object.keys(PermissionFlagsBits).find((k) => PermissionFlagsBits[k] === p)}\``
      ).join(', ');
      return interaction.reply({
        embeds: [buildEmbed({
          title: '❌ Missing Bot Permissions',
          description: `I need: ${names}\n\n🔗 **[Click here to re-invite me with correct permissions](${config.inviteUrl})**\nKick the bot and use the link above to re-invite with all required permissions.`,
          color: config.colors.red,
        })],
        flags: 64,
      });
    }
  }

  await interaction.deferReply({ flags: 64 });
  await interaction.editReply({ embeds: [buildProgressEmbed(5, '🤖 Asking Gemini to design your server...')] });

  let plan;
  try {
    plan = await generateServerStructure(serverIdea, requirements);
  } catch (err) {
    logger.error('Gemini generation failed', err.message);
    return interaction.editReply({
      embeds: [buildEmbed({ title: '❌ AI Generation Failed', description: err.message, color: config.colors.red })],
    });
  }

  await saveGeneration(interaction.guildId, {
    prompt: `${serverIdea}${requirements ? ' | ' + requirements : ''}`,
    plan,
    roleIds: [],
    categoryIds: [],
    channelIds: [],
  });

  const rolesText = plan.roles.map((r) => `• **${r.name}**`).join('\n') || 'None';
  const categoriesText = plan.categories.map((c) => {
    const channels = c.channels.map((ch) => `  ${ch.type === 'voice' ? '🔊' : '💬'} ${ch.name}`).join('\n');
    return `**${c.name}**\n${channels}`;
  }).join('\n\n');

  const previewEmbed = buildEmbed({
    title: `🤖 AI Plan Ready: ${plan.name ?? serverIdea}`,
    description: `Here's what OpenAI designed for **"${serverIdea}"**. Review and click **Create** to build it.`,
    fields: [
      { name: '🎭 Roles', value: rolesText.slice(0, 1024), inline: true },
      { name: '📁 Structure', value: categoriesText.slice(0, 1024), inline: true },
    ],
    color: config.colors.blurple,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm_create').setLabel('✅ Create').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('preview_plan').setLabel('👁️ Preview').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cancel_action').setLabel('✖ Cancel').setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [previewEmbed], components: [row] });
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
async function handleButton(interaction, client) {
  // Get guild from cache — it's always cached since bot is in the guild
  const guild = client.guilds.cache.get(interaction.guildId);
  if (!guild) {
    logger.warn(`Guild ${interaction.guildId} not in cache`);
    return;
  }

  const { customId } = interaction;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      embeds: [buildEmbed({ title: '❌ No Permission', description: 'You need **Manage Server** to do this.', color: config.colors.red })],
      flags: 64,
    });
  }

  if (customId === 'cancel_action') {
    return interaction.update({
      embeds: [buildEmbed({ title: '✖ Cancelled', description: 'Action cancelled.', color: config.colors.yellow })],
      components: [],
    });
  }

  if (customId === 'preview_plan') {
    const record = getGeneration(guild.id);
    if (!record?.plan) {
      return interaction.reply({
        embeds: [buildEmbed({ title: '❌ No Plan', description: 'Run `/setup` first.', color: config.colors.red })],
        flags: 64,
      });
    }
    const { plan } = record;
    const categoriesText = plan.categories.map((c) => {
      const channels = c.channels.map((ch) => `  ${ch.type === 'voice' ? '🔊' : '💬'} ${ch.name}`).join('\n');
      return `**${c.name}**\n${channels}`;
    }).join('\n\n');

    return interaction.reply({
      embeds: [buildEmbed({
        title: `👁️ Full Preview: ${plan.name}`,
        fields: [
          { name: '🎭 Roles', value: plan.roles.map((r) => `• ${r.name} (${r.color ?? 'default'})`).join('\n').slice(0, 1024) },
          { name: '📁 Categories & Channels', value: categoriesText.slice(0, 1024) },
        ],
      })],
      flags: 64,
    });
  }

  if (customId === 'confirm_create') return runBuild(interaction, guild);
  if (customId === 'confirm_delete') return runDelete(interaction, guild);
  if (customId === 'confirm_regenerate') return runRegenerate(interaction, guild);
}

// ─── Build Orchestration ──────────────────────────────────────────────────────
async function runBuild(interaction, guild) {
  const record = getGeneration(guild.id);
  if (!record?.plan) {
    return interaction.update({
      embeds: [buildEmbed({ title: '❌ No Plan', description: 'Run `/setup` first.', color: config.colors.red })],
      components: [],
    });
  }

  await interaction.update({ embeds: [buildProgressEmbed(10, '🎭 Creating roles...')], components: [] });

  const onProgress = async (pct, msg) => {
    await interaction.editReply({ embeds: [buildProgressEmbed(pct, msg)] }).catch(() => {});
  };

  try {
    const { roleIds, categoryIds, channelIds } = await buildServerStructure(guild, record.plan, onProgress);
    await saveGeneration(guild.id, { ...record, roleIds, categoryIds, channelIds });

    await interaction.editReply({
      embeds: [buildEmbed({
        title: '✅ Server Built Successfully!',
        description: [
          `**${record.plan.name ?? 'Your server'}** has been fully set up by IWA Maker!`,
          '',
          `🎭 **${roleIds.length}** roles created`,
          `📁 **${categoryIds.length}** categories created`,
          `💬 **${channelIds.length}** channels created`,
          '',
          'Use `/delete-generated` to remove bot-created resources anytime.',
        ].join('\n'),
        color: config.colors.green,
      })],
    });

    logger.info(`Build complete for guild ${guild.id}: ${roleIds.length} roles, ${categoryIds.length} cats, ${channelIds.length} channels`);
  } catch (err) {
    logger.error('Build failed', err.message);
    await interaction.editReply({
      embeds: [buildEmbed({ title: '❌ Build Failed', description: err.message, color: config.colors.red })],
    });
  }
}

// ─── Delete Orchestration ─────────────────────────────────────────────────────
async function runDelete(interaction, guild) {
  const record = getGeneration(guild.id);
  if (!record) {
    return interaction.update({
      embeds: [buildEmbed({ title: '❌ Nothing to Delete', description: 'No generated resources found.', color: config.colors.red })],
      components: [],
    });
  }

  await interaction.update({ embeds: [buildProgressEmbed(10, '🗑️ Deleting bot-created resources...')], components: [] });

  try {
    await deleteGeneratedResources(guild, record);
    await deleteGeneration(guild.id);

    await interaction.editReply({
      embeds: [buildEmbed({
        title: '✅ Cleanup Complete',
        description: 'All bot-created channels, categories, and roles have been removed.',
        color: config.colors.green,
      })],
    });
  } catch (err) {
    logger.error('Delete failed', err.message);
    await interaction.editReply({
      embeds: [buildEmbed({ title: '❌ Delete Failed', description: err.message, color: config.colors.red })],
    });
  }
}

// ─── Regenerate Orchestration ─────────────────────────────────────────────────
async function runRegenerate(interaction, guild) {
  const record = getGeneration(guild.id);
  if (!record) {
    return interaction.update({
      embeds: [buildEmbed({ title: '❌ Nothing to Regenerate', description: 'No previous generation found.', color: config.colors.red })],
      components: [],
    });
  }

  await interaction.update({ embeds: [buildProgressEmbed(5, '🗑️ Removing old structure...')], components: [] });

  try {
    await deleteGeneratedResources(guild, record);
    await interaction.editReply({ embeds: [buildProgressEmbed(15, '🤖 Asking Gemini to redesign...')] });

    const [serverIdea, requirements] = record.prompt.split(' | ');
    const plan = await generateServerStructure(serverIdea, requirements ?? '');

    await saveGeneration(guild.id, { prompt: record.prompt, plan, roleIds: [], categoryIds: [], channelIds: [] });

    const onProgress = async (pct, msg) => {
      await interaction.editReply({ embeds: [buildProgressEmbed(pct, msg)] }).catch(() => {});
    };

    const { roleIds, categoryIds, channelIds } = await buildServerStructure(guild, plan, onProgress);
    await saveGeneration(guild.id, { prompt: record.prompt, plan, roleIds, categoryIds, channelIds });

    await interaction.editReply({
      embeds: [buildEmbed({
        title: '✅ Server Regenerated!',
        description: `**${plan.name ?? 'Your server'}** has been rebuilt from scratch.\n\n🎭 **${roleIds.length}** roles · 📁 **${categoryIds.length}** categories · 💬 **${channelIds.length}** channels`,
        color: config.colors.green,
      })],
    });
  } catch (err) {
    logger.error('Regenerate failed', err.message);
    await interaction.editReply({
      embeds: [buildEmbed({ title: '❌ Regeneration Failed', description: err.message, color: config.colors.red })],
    });
  }
}
