const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase: supabaseConfig, google: googleConfig } = require('../config/env');
const logger = require('../utils/logger');

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// Initialize Google AI
const genAI = new GoogleGenerativeAI(googleConfig.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const TABLE_NAME = 'agent_memory';

/**
 * Generate embedding for text using Google Gemini
 */
const getEmbedding = async (text) => {
  const result = await model.embedContent({
    content: { parts: [{ text: text.slice(0, 8000) }] },
    outputDimensionality: 768
  });
  return result.embedding.values;
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
    logger.error(`Memory search failed: ${err.message}`, { stack: err.stack, details: err.details });
    return [];
  }
};

module.exports = { storeMemory, searchMemory, getEmbedding };
