import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app.config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
