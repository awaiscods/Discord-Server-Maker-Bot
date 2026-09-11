// src/services/database.js - Persistent JSON storage via lowdb
import { JSONFilePreset } from 'lowdb/node';
import { logger } from '../utils/logger.js';

const DEFAULT_DATA = { generations: {} };

let db;

export async function initDatabase() {
  db = await JSONFilePreset('data/db.json', DEFAULT_DATA);
  logger.info('Database initialized');
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Save a generation record for a guild
 */
export async function saveGeneration(guildId, data) {
  const database = getDb();
  database.data.generations[guildId] = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  await database.write();
  logger.debug(`Saved generation for guild ${guildId}`);
}

/**
 * Get the generation record for a guild
 */
export function getGeneration(guildId) {
  return getDb().data.generations[guildId] ?? null;
}

/**
 * Delete the generation record for a guild
 */
export async function deleteGeneration(guildId) {
  const database = getDb();
  delete database.data.generations[guildId];
  await database.write();
  logger.debug(`Deleted generation for guild ${guildId}`);
}
