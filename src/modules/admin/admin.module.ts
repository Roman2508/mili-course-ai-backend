import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, CoursesModule, CommonModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
