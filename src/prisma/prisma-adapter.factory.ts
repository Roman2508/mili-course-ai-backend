import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export interface PrismaAdapterFactoryResult {
  adapter: PrismaPg;
  pool: Pool;
}

function shouldUseSsl(databaseUrl: string) {
  const normalized = databaseUrl.toLowerCase();

  if (normalized.includes('sslmode=require')) {
    return true;
  }

  return (
    normalized.includes('.render.com') ||
    normalized.includes('.neon.tech') ||
    normalized.includes('.supabase.co') ||
    normalized.includes('.amazonaws.com')
  );
}

export function createPrismaPgAdapter(
  databaseUrl: string,
): PrismaAdapterFactoryResult {
  const useSsl = shouldUseSsl(databaseUrl);
  const pool = new Pool({
    connectionString: databaseUrl,
    ...(useSsl
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  });

  return {
    adapter: new PrismaPg(pool),
    pool,
  };
}
