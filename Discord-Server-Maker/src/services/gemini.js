// src/services/gemini.js - Google Gemini AI integration
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config/config.js';
import { logger } from '../utils/logger.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

const SYSTEM_PROMPT = `You are a Discord server architect. Design a complete Discord server structure based on the user's idea.

RULES:
- Return ONLY valid JSON, no markdown, no explanation, no code blocks
- Use only valid Discord permission flag names from this list: Administrator, ManageGuild, ManageChannels, ManageRoles, ManageMessages, KickMembers, BanMembers, ModerateMembers, ManageThreads, SendMessages, ViewChannel, ReadMessageHistory, EmbedLinks, AttachFiles, AddReactions, UseExternalEmojis, MentionEveryone, Connect, Speak, MuteMembers, DeafenMembers, MoveMembers
- Role colors must be valid hex strings like "#ff0000"
- Channel types must be exactly "text" or "voice"
- Keep names concise and professional
- Include 4-8 roles, 4-8 categories, 2-6 channels per category

JSON SCHEMA:
{
  "name": "Server Name",
  "roles": [
    { "name": "RoleName", "color": "#hexcolor", "permissions": ["PermFlag"] }
  ],
  "categories": [
    {
      "name": "CATEGORY NAME",
      "channels": [
        { "type": "text|voice", "name": "channel-name" }
      ]
    }
  ]
}`;

/**
 * Generate a Discord server structure from a user prompt
 * @param {string} serverIdea - The user's server idea
 * @param {string} requirements - Additional requirements
 * @returns {Promise<Object>} Parsed server structure JSON
 */
export async function generateServerStructure(serverIdea, requirements) {
  const userPrompt = `Server Idea: ${serverIdea}\nAdditional Requirements: ${requirements || 'None'}`;

  logger.info(`Sending prompt to Gemini: ${serverIdea}`);

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userPrompt },
  ]);

  const raw = result.response.text().trim();
  logger.debug('Gemini raw response received');

  // Strip any accidental markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error('Gemini returned invalid JSON', cleaned.slice(0, 300));
    throw new Error('Gemini returned invalid JSON. Please try again.');
  }

  validateStructure(parsed);
  return parsed;
}

function validateStructure(data) {
  if (!data.roles || !Array.isArray(data.roles)) throw new Error('Missing or invalid "roles" array');
  if (!data.categories || !Array.isArray(data.categories)) throw new Error('Missing or invalid "categories" array');
  for (const cat of data.categories) {
    if (!cat.channels || !Array.isArray(cat.channels)) throw new Error(`Category "${cat.name}" missing channels array`);
  }
}
