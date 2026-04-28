import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app.config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BetterAuthService } from './better-auth.service';

@Global()
@Module({
  imports: [AppConfigModule, PrismaModule],
  controllers: [AuthController],
  providers: [BetterAuthService, AuthService],
  exports: [BetterAuthService, AuthService],
})
export class AuthModule {}
