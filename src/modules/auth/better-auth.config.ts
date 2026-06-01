import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin } from 'better-auth/plugins';
import type { PrismaClient } from '../../generated/prisma/client';

export interface BetterAuthFactoryOptions {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  isProduction: boolean;
}

export function createBetterAuth(
  prisma: PrismaClient,
  options: BetterAuthFactoryOptions,
) {
  const sameSite = options.isProduction ? 'none' : 'lax';

  return betterAuth({
    appName: 'Mili Course AI',
    baseURL: options.baseURL,
    basePath: '/auth/api',
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    user: {
      modelName: 'user',
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
      additionalFields: {
        role: {
          type: ['student', 'admin'],
          required: false,
          defaultValue: 'student',
          input: false,
        },
      },
    },
    session: {
      modelName: 'session',
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: 'compact',
      },
    },
    account: {
      modelName: 'account',
      accountLinking: {
        enabled: true,
        trustedProviders: ['email-password'],
        allowDifferentEmails: false,
      },
    },
    verification: {
      modelName: 'verification',
    },
    plugins: [
      adminPlugin({
        defaultRole: 'student',
        adminRoles: ['admin'],
      }),
    ],
    rateLimit: {
      enabled: true,
      customRules: {
        '/auth/api/sign-in/email': {
          window: 60,
          max: 5,
        },
        '/auth/sign-in/email': {
          window: 60,
          max: 5,
        },
        '/auth/api/sign-up/email': {
          window: 60,
          max: 5,
        },
        '/auth/sign-up/email': {
          window: 60,
          max: 5,
        },
      },
    },
    advanced: {
      useSecureCookies: options.isProduction,
      cookiePrefix: 'mili-course-ai',
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite,
        secure: options.isProduction,
        path: '/',
      },
      disableCSRFCheck: false,
      disableOriginCheck: false,
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
      },
    },
  });
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
