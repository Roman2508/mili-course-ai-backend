import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
