import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().required(),

  RABBITMQ_URL: Joi.string().uri().required(),

  TMDB_API_KEY: Joi.string().min(1).required(),

  TMDB_BASE_URL: Joi.string().uri().default('https://api.themoviedb.org/3'),

  TMDB_LANGUAGE: Joi.string()
    .pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
    .default('es-ES'),

  GROQ_API_KEY: Joi.string().min(1).required(),

  GROQ_BASE_URL: Joi.string().uri().default('https://api.groq.com/openai/v1'),

  GROQ_MODEL: Joi.string().min(1).default('openai/gpt-oss-20b'),

  GROQ_RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(30),

  RECOMMENDATION_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).default(3),

  AUTH_RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(10),

  RECOMMENDATION_MAX_WAIT_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(24 * 60)
    .default(30),

  BETTER_AUTH_SECRET: Joi.string().min(32).required(),

  FRONTEND_URL: Joi.string().uri().required(),

  BETTER_AUTH_URL: Joi.string().uri().required(),
});
