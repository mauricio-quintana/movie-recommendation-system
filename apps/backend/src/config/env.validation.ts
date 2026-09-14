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

  GROQ_API_KEY: Joi.string().min(1).required(),

  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
});
