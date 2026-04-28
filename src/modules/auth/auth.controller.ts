import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { appendResponseHeaders } from '../../common/utils/http.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('ok')
  getStatus() {
    return {
      status: 'ok',
    };
  }

  @Get('session')
  async getSession(@Req() request: Request) {
    return this.authService.getSession(request);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto, request);

    appendResponseHeaders(response, result.headers);

    return result.session;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, request);

    appendResponseHeaders(response, result.headers);

    return result.session;
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(request);

    appendResponseHeaders(response, result.headers);

    return {
      success: result.success,
    };
  }
}
