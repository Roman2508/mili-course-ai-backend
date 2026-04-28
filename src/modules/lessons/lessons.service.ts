import { Injectable } from '@nestjs/common';
import { LearningService } from '../learning/learning.service';

@Injectable()
export class LessonsService {
  constructor(private readonly learningService: LearningService) {}

  async completeLesson(
    userId: string,
    courseId: string,
    lessonId: string,
  ) {
    return this.learningService.markLessonCompleted(
      userId,
      courseId,
      lessonId,
    );
  }
}
