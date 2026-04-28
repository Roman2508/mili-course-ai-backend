import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../config/app.config';
import { PrismaClient } from '../generated/prisma/client';
import { createPrismaPgAdapter } from './prisma-adapter.factory';
import type { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(private readonly appConfigService: AppConfigService) {
    const { adapter, pool } = createPrismaPgAdapter(
      appConfigService.databaseUrl,
    );

    super({
      adapter,
      log: appConfigService.isProduction ? ['error'] : ['error', 'warn'],
    });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
