import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { MarkLessonCompletedDto } from './dto/mark-lesson-completed.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
@UseGuards(AuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post(':id/complete')
  async completeLesson(
    @CurrentUser('id') userId: string,
    @Param('id') lessonId: string,
    @Body() dto: MarkLessonCompletedDto,
  ) {
    return this.lessonsService.completeLesson(
      userId,
      dto.courseId,
      lessonId,
    );
  }
}
