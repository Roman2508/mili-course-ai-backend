import type { Request } from 'express';
import { Injectable, NotFoundException } from '@nestjs/common';
import { toHeaders } from '../../common/utils/http.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BetterAuthService } from '../auth/better-auth.service';
import type { SessionUser } from '../auth/auth.types';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userProfileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  interests: true,
  profileSummary: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betterAuthService: BetterAuthService,
  ) {}

  async getMe(userId: string) {
    return this.findUserOrThrow(userId);
  }

  async updateMe(
    user: SessionUser,
    dto: UpdateProfileDto,
    request: Request,
  ) {
    const name = dto.name.trim();
    const profileSummary = dto.profileSummary.trim();
    const headers = toHeaders(request.headers);
    let responseHeaders = new Headers();

    if (name !== user.name.trim()) {
      const result = await this.betterAuthService.api.updateUser({
        headers,
        body: {
          name,
        },
        returnHeaders: true,
      });

      responseHeaders = result.headers;
    }

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        interests: dto.interests,
        profileSummary,
      },
      select: userProfileSelect,
    });

    return {
      headers: responseHeaders,
      user: updatedUser,
    };
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: userProfileSelect,
    });

    if (!user) {
      throw new NotFoundException(`User "${userId}" was not found.`);
    }

    return user;
  }
}
