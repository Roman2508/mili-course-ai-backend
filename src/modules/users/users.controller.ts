import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { appendResponseHeaders } from '../../common/utils/http.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import type { SessionUser } from '../auth/auth.types';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: SessionUser,
    @Body() dto: UpdateProfileDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.usersService.updateMe(user, dto, request);

    appendResponseHeaders(response, result.headers);

    return result.user;
  }
}
