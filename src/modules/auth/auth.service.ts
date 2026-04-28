import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { APIError } from 'better-auth/api';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { toHeaders } from '../../common/utils/http.util';
import { BetterAuthService } from './better-auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { SessionUser } from './auth.types';

const DEFAULT_PROFILE_SUMMARY =
  'Новий курсант платформи військової підготовки.';

@Injectable()
export class AuthService {
  constructor(
    private readonly betterAuthService: BetterAuthService,
    private readonly prismaService: PrismaService,
  ) {}

  async register(dto: RegisterDto, request: Request) {
    try {
      const { headers, response } =
        await this.betterAuthService.api.signUpEmail({
          headers: toHeaders(request.headers),
          body: {
            name: dto.name.trim(),
            email: dto.email.trim().toLowerCase(),
            password: dto.password,
          },
          returnHeaders: true,
        });

      await this.ensureDefaultProfile(response.user.id);

      return {
        headers,
        session: this.betterAuthService.mapSessionUser(response.user),
      };
    } catch (error) {
      this.handleBetterAuthError(error);
    }
  }

  async login(dto: LoginDto, request: Request) {
    try {
      const { headers, response } =
        await this.betterAuthService.api.signInEmail({
          headers: toHeaders(request.headers),
          body: {
            email: dto.email.trim().toLowerCase(),
            password: dto.password,
          },
          returnHeaders: true,
        });

      return {
        headers,
        session: this.betterAuthService.mapSessionUser(response.user),
      };
    } catch (error) {
      this.handleBetterAuthError(error);
    }
  }

  async logout(request: Request) {
    try {
      const { headers } = await this.betterAuthService.api.signOut({
        headers: toHeaders(request.headers),
        returnHeaders: true,
      });

      return {
        headers,
        success: true,
      };
    } catch (error) {
      this.handleBetterAuthError(error);
    }
  }

  async getSession(request: Request): Promise<SessionUser | null> {
    const session = await this.betterAuthService.getSession(request);

    return session
      ? this.betterAuthService.mapSessionUser(session.user)
      : null;
  }

  private async ensureDefaultProfile(userId: string) {
    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        profileSummary: DEFAULT_PROFILE_SUMMARY,
      },
    });
  }

  private handleBetterAuthError(error: unknown): never {
    if (error instanceof APIError) {
      throw new HttpException(
        {
          message: error.message,
          details: error.body ?? null,
        },
        typeof error.status === 'number'
          ? error.status
          : HttpStatus.BAD_REQUEST,
      );
    }

    throw error;
  }
}
