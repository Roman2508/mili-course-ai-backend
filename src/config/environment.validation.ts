const REQUIRED_ENVIRONMENT_KEYS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'FRONTEND_ORIGIN',
] as const;

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  FRONTEND_ORIGIN: string;
}

export function validateEnvironment(rawConfig: Record<string, unknown>): EnvironmentVariables {
  for (const key of REQUIRED_ENVIRONMENT_KEYS) {
    const value = rawConfig[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const nodeEnv = (rawConfig.NODE_ENV as string | undefined) ?? 'development';

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV value: ${nodeEnv}`);
  }

  const port = Number((rawConfig.PORT as string | undefined) ?? '4000');

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  const betterAuthSecret = String(rawConfig.BETTER_AUTH_SECRET);

  if (betterAuthSecret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long.');
  }

  return {
    NODE_ENV: nodeEnv as EnvironmentVariables['NODE_ENV'],
    PORT: port,
    DATABASE_URL: String(rawConfig.DATABASE_URL),
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: String(rawConfig.BETTER_AUTH_URL),
    FRONTEND_ORIGIN: String(rawConfig.FRONTEND_ORIGIN),
  };
}
