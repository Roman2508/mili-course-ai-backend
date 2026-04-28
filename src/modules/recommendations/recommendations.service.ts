import { Injectable } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { LearningService } from '../learning/learning.service';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly learningService: LearningService,
  ) {}

  async getRecommendationsContext(userId: string) {
    const [coursesResult, myLearning] = await Promise.all([
      this.coursesService.findMany(),
      this.learningService.getMyLearning(userId),
    ]);
    const courses = coursesResult.items;

    return {
      courses,
      myLearning: myLearning.courses,
      weakTopics: myLearning.weakTopics,
      interests: myLearning.interests,
      profileSummary: myLearning.profileSummary,
      courseEmbeddings: courses.map((course) => ({
        courseId: course.id,
        generatedEmbedding: course.generatedEmbedding,
      })),
      userProfileText: this.buildUserProfileText({
        myLearning: myLearning.courses,
        weakTopics: myLearning.weakTopics,
        interests: myLearning.interests,
        profileSummary: myLearning.profileSummary,
      }),
    };
  }

  private buildUserProfileText(input: {
    myLearning: {
      courseId: string;
      status: string;
      progressPercent: number;
    }[];
    weakTopics: {
      label: string;
      confidenceGap: number;
    }[];
    interests: string[];
    profileSummary: string;
  }) {
    const learningSnapshot = input.myLearning
      .map(
        (course) =>
          `${course.courseId}:${course.status}:${course.progressPercent}%`,
      )
      .join('; ');
    const weakTopics = input.weakTopics
      .map((topic) => `${topic.label}:${topic.confidenceGap}`)
      .join('; ');
    const interests = input.interests.join(', ');

    return [
      `Опис профілю: ${input.profileSummary}`,
      `Навчальні інтереси: ${interests}`,
      `Слабкі теми: ${weakTopics}`,
      `Поточний прогрес: ${learningSnapshot}`,
    ].join('. ');
  }
}
