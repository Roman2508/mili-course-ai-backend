import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { CoursesModule } from '../courses/courses.module';
import { LearningModule } from '../learning/learning.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [CommonModule, CoursesModule, LearningModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
