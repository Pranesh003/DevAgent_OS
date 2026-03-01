const { createClient } = require('@supabase/supabase-js');
// Import OpenAI class explicitly for v4
const { OpenAI } = require('openai');
const { supabase: supabaseConfig, openai: openaiConfig } = require('../config/env');
const logger = require('../utils/logger');

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// Initialize OpenAI v4 client
const openai = new OpenAI({ apiKey: openaiConfig.apiKey });

const TABLE_NAME = 'agent_memory';

/**
 * Generate embedding for text using OpenAI
 */
const getEmbedding = async (text) => {
  // Use new v4 API format
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // Supabase vector has size limits
  });
  return response.data[0].embedding;
};

/**
 * Store a memory entry with embedding
 */
const storeMemory = async ({ content, type, projectId, metadata = {}, userId }) => {
  try {
    const embedding = await getEmbedding(content);
    const { data, error } = await supabase.from(TABLE_NAME).insert({
      content,
      type,
      project_id: projectId,
      user_id: userId?.toString(),
      metadata,
      embedding,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    logger.info(`Memory stored: [${type}] ${content.slice(0, 60)}...`);
    return data;
  } catch (err) {
    logger.error('Memory store failed:', err.message);
    throw err;
  }
};

/**
 * Semantic similarity search over memory
 */
const searchMemory = async (query, projectId, limit = 5) => {
  try {
    const queryEmbedding = await getEmbedding(query);

    const { data, error } = await supabase.rpc('match_agent_memory', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      filter_project_id: projectId || null,
    });

    if (error) throw error;
    return data || [];
  } catch (err) {
    logger.error('Memory search failed:', err.message);
    return [];
  }
};

module.exports = { storeMemory, searchMemory, getEmbedding };
