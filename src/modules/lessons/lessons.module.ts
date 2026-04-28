import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { LearningModule } from '../learning/learning.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [CommonModule, LearningModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
