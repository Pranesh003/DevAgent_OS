const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(5000),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_KEY: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  GOOGLE_API_KEY: Joi.string().required(),
  ORCHESTRATOR_URL: Joi.string().uri().default("http://localhost:8000"),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  supabase: {
    url: envVars.SUPABASE_URL,
    anonKey: envVars.SUPABASE_ANON_KEY,
    serviceKey: envVars.SUPABASE_SERVICE_KEY,
  },
  openai: {
    apiKey: envVars.OPENAI_API_KEY,
  },
  google: {
    apiKey: envVars.GOOGLE_API_KEY,
  },
  orchestratorUrl: envVars.ORCHESTRATOR_URL,
};
