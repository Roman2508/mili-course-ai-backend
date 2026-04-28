import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { LearningService } from './learning.service';

@Controller('learning')
@UseGuards(AuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get()
  async getMyLearning(@CurrentUser('id') userId: string) {
    return this.learningService.getMyLearning(userId);
  }

  @Post('courses/:courseId/start')
  async startCourse(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.learningService.startCourse(userId, courseId);
  }
}
