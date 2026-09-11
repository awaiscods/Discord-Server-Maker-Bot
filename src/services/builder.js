// src/services/builder.js - Discord server structure builder
import { ChannelType, PermissionsBitField, OverwriteType } from 'discord.js';
import config from '../../config/config.js';
import { sleep, withRetry, toChannelName } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Build the full server structure from a Gemini-generated plan
 * @param {import('discord.js').Guild} guild
 * @param {Object} plan - Parsed Gemini JSON plan
 * @param {Function} onProgress - Callback(percent, message)
 * @returns {Promise<{roleIds: string[], categoryIds: string[], channelIds: string[]}>}
 */
export async function buildServerStructure(guild, plan, onProgress) {
  const createdRoleIds = [];
  const createdCategoryIds = [];
  const createdChannelIds = [];
  const roleMap = {}; // name -> Role

  // --- STEP 1: Roles (0-35%) ---
  await onProgress(10, '🎭 Creating roles...');
  const existingRoleNames = new Set(guild.roles.cache.map((r) => r.name.toLowerCase()));

  for (let i = 0; i < plan.roles.length; i++) {
    const roleDef = plan.roles[i];
    if (existingRoleNames.has(roleDef.name.toLowerCase())) {
      logger.info(`Role "${roleDef.name}" already exists, skipping`);
      const existing = guild.roles.cache.find((r) => r.name.toLowerCase() === roleDef.name.toLowerCase());
      if (existing) roleMap[roleDef.name] = existing;
      continue;
    }

    const role = await withRetry(() =>
      guild.roles.create({
        name: roleDef.name,
        color: roleDef.color ?? '#99aab5',
        permissions: resolvePermissions(roleDef.permissions),
        reason: 'IWA Maker: AI-generated role',
      })
    );

    roleMap[roleDef.name] = role;
    createdRoleIds.push(role.id);
    logger.info(`Created role: ${role.name}`);
    await sleep(config.rateLimits.roleCreate);

    const pct = 10 + Math.round(((i + 1) / plan.roles.length) * 25);
    await onProgress(pct, `🎭 Creating roles... (${i + 1}/${plan.roles.length})`);
  }

  // --- STEP 2: Categories & Channels (35-85%) ---
  await onProgress(35, '📁 Creating categories...');
  const existingCatNames = new Set(
    guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).map((c) => c.name.toLowerCase())
  );

  for (let ci = 0; ci < plan.categories.length; ci++) {
    const catDef = plan.categories[ci];
    let category;

    if (existingCatNames.has(catDef.name.toLowerCase())) {
      logger.info(`Category "${catDef.name}" already exists, skipping creation`);
      category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catDef.name.toLowerCase()
      );
    } else {
      category = await withRetry(() =>
        guild.channels.create({
          name: catDef.name,
          type: ChannelType.GuildCategory,
          reason: 'IWA Maker: AI-generated category',
        })
      );
      createdCategoryIds.push(category.id);
      logger.info(`Created category: ${category.name}`);
      await sleep(config.rateLimits.categoryCreate);
    }

    // Create channels inside this category
    const existingChannelNames = new Set(guild.channels.cache.map((c) => c.name.toLowerCase()));

    for (let chi = 0; chi < catDef.channels.length; chi++) {
      const chDef = catDef.channels[chi];
      const safeName = toChannelName(chDef.name);

      if (existingChannelNames.has(safeName)) {
        logger.info(`Channel "${safeName}" already exists, skipping`);
        continue;
      }

      const channelType = chDef.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

      const channel = await withRetry(() =>
        guild.channels.create({
          name: safeName,
          type: channelType,
          parent: category.id,
          reason: 'IWA Maker: AI-generated channel',
        })
      );

      createdChannelIds.push(channel.id);
      existingChannelNames.add(safeName);
      logger.info(`Created channel: #${channel.name}`);
      await sleep(config.rateLimits.channelCreate);
    }

    const pct = 35 + Math.round(((ci + 1) / plan.categories.length) * 50);
    await onProgress(pct, `📁 Creating categories & channels... (${ci + 1}/${plan.categories.length})`);
  }

  // --- STEP 3: Apply Muted role permissions (85-95%) ---
  await onProgress(85, '🔒 Applying permissions...');
  const mutedRole = roleMap['Muted'] ?? guild.roles.cache.find((r) => r.name.toLowerCase() === 'muted');
  if (mutedRole) {
    await applyMutedPermissions(guild, mutedRole, createdChannelIds);
  }

  return { roleIds: createdRoleIds, categoryIds: createdCategoryIds, channelIds: createdChannelIds };
}

/**
 * Delete all bot-created resources for a guild
 */
export async function deleteGeneratedResources(guild, record) {
  const toDelete = [
    ...record.channelIds,
    ...record.categoryIds,
    ...record.roleIds,
  ];

  for (const id of toDelete) {
    try {
      const channel = guild.channels.cache.get(id);
      if (channel) {
        await channel.delete('IWA Maker: cleanup');
        await sleep(300);
        continue;
      }
      const role = guild.roles.cache.get(id);
      if (role) {
        await role.delete('IWA Maker: cleanup');
        await sleep(300);
      }
    } catch (err) {
      logger.warn(`Could not delete resource ${id}: ${err.message}`);
    }
  }
}

/**
 * Resolve permission string names to a PermissionsBitField
 */
function resolvePermissions(perms) {
  if (!perms || perms.length === 0) return new PermissionsBitField(0n);
  const valid = [];
  for (const p of perms) {
    if (PermissionsBitField.Flags[p] !== undefined) {
      valid.push(p);
    } else {
      logger.warn(`Unknown permission flag: "${p}", skipping`);
    }
  }
  return valid.length ? new PermissionsBitField(valid.map((p) => PermissionsBitField.Flags[p])) : new PermissionsBitField(0n);
}

/**
 * Apply SendMessages: false to all created text channels for the Muted role
 */
async function applyMutedPermissions(guild, mutedRole, channelIds) {
  for (const id of channelIds) {
    const channel = guild.channels.cache.get(id);
    if (!channel || channel.type !== ChannelType.GuildText) continue;
    try {
      await channel.permissionOverwrites.create(mutedRole, { SendMessages: false }, { reason: 'IWA Maker: muted role' });
      await sleep(config.rateLimits.permissionSet);
    } catch (err) {
      logger.warn(`Could not set muted perms on ${channel.name}: ${err.message}`);
    }
  }
}
