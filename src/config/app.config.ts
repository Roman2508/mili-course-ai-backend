import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentVariables, validateEnvironment } from './environment.validation';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  get nodeEnv(): EnvironmentVariables['NODE_ENV'] {
    return this.configService.get('NODE_ENV', {
      infer: true,
    });
  }

  get port(): number {
    return this.configService.get('PORT', {
      infer: true,
    });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', {
      infer: true,
    });
  }

  get betterAuthSecret(): string {
    return this.configService.get('BETTER_AUTH_SECRET', {
      infer: true,
    });
  }

  get betterAuthUrl(): string {
    return this.configService.get('BETTER_AUTH_URL', {
      infer: true,
    });
  }

  get frontendOrigin(): string {
    return this.configService.get('FRONTEND_ORIGIN', {
      infer: true,
    });
  }

  get trustedOrigins(): string[] {
    return [this.frontendOrigin];
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
