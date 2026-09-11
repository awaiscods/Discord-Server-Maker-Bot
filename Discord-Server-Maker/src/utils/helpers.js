// src/utils/helpers.js - Shared utility functions
import { EmbedBuilder } from 'discord.js';
import config from '../../config/config.js';
import { logger } from './logger.js';

/**
 * Sleep for a given number of milliseconds
 */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry an async function up to maxRetries times with exponential backoff
 */
export async function withRetry(fn, retries = config.maxRetries, delay = config.retryDelay) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await sleep(delay * attempt);
    }
  }
}

/**
 * Build a standard blurple embed
 */
export function buildEmbed({ title, description, color, fields = [], footer = 'Created by IWA Maker' }) {
  const embed = new EmbedBuilder()
    .setColor(color ?? config.colors.blurple)
    .setTimestamp()
    .setFooter({ text: footer });

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);

  return embed;
}

/**
 * Build a progress embed
 */
export function buildProgressEmbed(percent, status) {
  const bar = buildProgressBar(percent);
  return buildEmbed({
    title: '⚙️ Building Your Server...',
    description: `${bar} **${percent}%**\n\n${status}`,
  });
}

function buildProgressBar(percent) {
  const filled = Math.round(percent / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

/**
 * Check if the bot has required permissions in a guild
 */
export function checkBotPermissions(guild, requiredPerms) {
  if (!guild || !guild.members?.me) return [];
  const botMember = guild.members.me;
  const missing = requiredPerms.filter((p) => !botMember.permissions.has(p));
  return missing;
}

/**
 * Sanitize a string to be a valid Discord channel name
 */
export function toChannelName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 100);
}
