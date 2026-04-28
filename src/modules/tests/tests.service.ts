import { Injectable } from '@nestjs/common';
import { LearningService } from '../learning/learning.service';

@Injectable()
export class TestsService {
  constructor(private readonly learningService: LearningService) {}

  async submitTest(
    userId: string,
    courseId: string,
    testOrModuleId: string,
    answers: Record<string, number>,
  ) {
    return this.learningService.submitTest(
      userId,
      courseId,
      testOrModuleId,
      answers,
    );
  }
}
