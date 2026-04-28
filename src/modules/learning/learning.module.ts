import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  imports: [PrismaModule, CoursesModule, CommonModule],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}
