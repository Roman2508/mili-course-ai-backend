import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '../../generated/prisma/client';
import { AppConfigService } from '../../config/app.config';
import { toHeaders } from '../../common/utils/http.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BetterAuthInstance,
  createBetterAuth,
} from './better-auth.config';
import type { AuthenticatedSession, SessionUser } from './auth.types';

@Injectable()
export class BetterAuthService {
  readonly auth: BetterAuthInstance;

  constructor(
    prismaService: PrismaService,
    appConfigService: AppConfigService,
  ) {
    this.auth = createBetterAuth(prismaService, {
      baseURL: appConfigService.betterAuthUrl,
      secret: appConfigService.betterAuthSecret,
      trustedOrigins: appConfigService.trustedOrigins,
      isProduction: appConfigService.isProduction,
    });
  }

  get api() {
    return this.auth.api;
  }

  async getSession(
    requestOrHeaders: Request | Headers,
  ): Promise<AuthenticatedSession | null> {
    const headers =
      requestOrHeaders instanceof Headers
        ? requestOrHeaders
        : toHeaders(requestOrHeaders.headers);

    return this.auth.api.getSession({
      headers,
      query: {
        disableCookieCache: true,
      },
    });
  }

  mapSessionUser(user: AuthenticatedSession['user']): SessionUser {
    const role = user.role === 'admin' ? 'admin' : 'student';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role as UserRole,
    };
  }
}
