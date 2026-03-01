const { createClient } = require('@supabase/supabase-js');
const { supabase: supabaseConfig } = require('./env');
const logger = require('../utils/logger');

if (!supabaseConfig.url || !supabaseConfig.serviceKey) {
  logger.error('Supabase URL and Service Key are required in the environment variables');
  process.exit(1);
}

// Initialize Supabase service role client (bypasses RLS for backend operations)
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Since @supabase/supabase-js uses REST under the hood, there is no persistent connection to "verify",
// but we perform a simple query to ensure the keys and URL are valid on startup.
const connectDB = async () => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    logger.info(`Supabase connected to project: ${new URL(supabaseConfig.url).hostname}`);
  } catch (err) {
    logger.error(`Supabase connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = { supabase, connectDB };
