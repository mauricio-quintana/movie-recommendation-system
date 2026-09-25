import '../config/load-env.js';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username } from 'better-auth/plugins';
import { prisma } from '../infrastructure/prisma/prisma.js';

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret) {
  throw new Error('BETTER_AUTH_SECRET is not set');
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  secret,

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    username({
      displayUsername: false,
      immutableUsername: true,
    }),
  ],
});
