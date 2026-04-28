import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app.config';
import { BetterAuthService } from './modules/auth/better-auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(AppConfigService);
  const betterAuthService = app.get(BetterAuthService);
  const authHandler = toNodeHandler(betterAuthService.auth);

  app.use(helmet());
  app.enableCors({
    origin: config.trustedOrigins,
    credentials: true,
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!request.path.startsWith('/auth/api')) {
      next();
      return;
    }

    void authHandler(request, response).catch(next);
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(config.port);
}

void bootstrap();
