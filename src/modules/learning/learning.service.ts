import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  Test,
  TestResult,
  UserCourseProgress,
} from '../../generated/prisma/client';
import { CoursesService } from '../courses/courses.service';
import type { CourseWithRelations } from '../courses/courses.mapper';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ModuleTestResultResponse,
  MyLearningResponse,
  UserLearningCourseResponse,
  WeakTopicResponse,
} from './learning.types';

const userCourseProgressInclude = {
  lessonProgresses: {
    orderBy: {
      completedAt: 'asc',
    },
  },
  testResults: {
    orderBy: {
      submittedAt: 'asc',
    },
    include: {
      test: {
        include: {
          questions: {
            orderBy: {
              order: 'asc',
            },
            include: {
              answers: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserCourseProgressInclude;

type UserCourseProgressWithRelations = Prisma.UserCourseProgressGetPayload<{
  include: typeof userCourseProgressInclude;
}>;

@Injectable()
export class LearningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  async getMyLearning(userId: string): Promise<MyLearningResponse> {
    const [user, progressRecords] = await Promise.all([
      this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          interests: true,
          profileSummary: true,
        },
      }),
      this.prismaService.userCourseProgress.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        include: userCourseProgressInclude,
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User "${userId}" was not found.`);
    }

    return {
      courses: progressRecords.map((progressRecord) =>
        this.mapCourseProgress(progressRecord),
      ),
      weakTopics: this.buildWeakTopics(progressRecords),
      interests: user.interests,
      profileSummary: user.profileSummary,
    };
  }

  async startCourse(
    userId: string,
    courseId: string,
  ): Promise<UserLearningCourseResponse> {
    await this.coursesService.getCourseEntityById(courseId);

    await this.prismaService.$transaction(async (transaction) => {
      const existingProgress = await transaction.userCourseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });
      const now = new Date();

      if (!existingProgress) {
        await transaction.userCourseProgress.create({
          data: {
            userId,
            courseId,
            status: 'in_progress',
            progressPercent: 0,
            startedAt: now,
          },
        });

        return;
      }

      if (existingProgress.status === 'completed') {
        return;
      }

      await transaction.userCourseProgress.update({
        where: {
          id: existingProgress.id,
        },
        data: {
          status: 'in_progress',
          startedAt: existingProgress.startedAt ?? now,
        },
      });
    });

    return this.getCourseLearningEntry(userId, courseId);
  }

  async markLessonCompleted(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<UserLearningCourseResponse> {
    const course = await this.coursesService.getCourseEntityById(courseId);
    const lessonContext = this.resolveLessonContext(course, lessonId);

    await this.prismaService.$transaction(async (transaction) => {
      const progress = await this.ensureCourseProgress(
        transaction,
        userId,
        courseId,
      );

      if (lessonContext.previousLessonId) {
        const previousLesson = await transaction.userLessonProgress.findUnique({
          where: {
            userId_lessonId: {
              userId,
              lessonId: lessonContext.previousLessonId,
            },
          },
        });

        if (!previousLesson) {
          throw new ConflictException(
            'The previous lesson must be completed first.',
          );
        }
      }

      await transaction.userLessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          courseId,
          courseModuleId: lessonContext.moduleId,
          lessonId,
          courseProgressId: progress.id,
        },
        update: {},
      });

      await this.recalculateCourseProgress(
        transaction,
        course,
        userId,
        courseId,
        lessonId,
      );
    });

    return this.getCourseLearningEntry(userId, courseId);
  }

  async submitTest(
    userId: string,
    courseId: string,
    testOrModuleId: string,
    answers: Record<string, number>,
  ) {
    const course = await this.coursesService.getCourseEntityById(courseId);
    const moduleAndTest = this.resolveModuleAndTest(course, testOrModuleId);

    this.validateAnswersPayload(answers);

    const result = await this.prismaService.$transaction(
      async (transaction) => {
        const progress = await this.ensureCourseProgress(transaction, userId, courseId);
        const completedLessons = await transaction.userLessonProgress.findMany({
          where: { userId, courseId, lessonId: {
              in: moduleAndTest.module.lessons.map((lesson) => lesson.id),
            },
          },
        });

        if (completedLessons.length !== moduleAndTest.module.lessons.length) {
          throw new ConflictException('All module lessons must be completed before submitting the test.');
        }

        const correctAnswers = moduleAndTest.test.questions.reduce(
          (score, question) => {
            const selectedOption = answers[question.id];
            const correctOptionIndex = question.answers.findIndex(
              (answer) => answer.isCorrect,
            );

            return score + Number(selectedOption === correctOptionIndex);
          },
          0,
        );
        const totalQuestions = moduleAndTest.test.questions.length;
        const percentageScore = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);

        const savedResult = await transaction.testResult.upsert({
          where: {
            userId_testId: { userId, testId: moduleAndTest.test.id },
          },
          create: {
            userId,
            courseId,
            courseModuleId: moduleAndTest.module.id,
            courseProgressId: progress.id,
            testId: moduleAndTest.test.id,
            score: percentageScore,
            correctAnswers,
            totalQuestions,
            answers,
          },
          update: {
            courseId,
            courseModuleId: moduleAndTest.module.id,
            courseProgressId: progress.id,
            score: percentageScore,
            correctAnswers,
            totalQuestions,
            answers,
            submittedAt: new Date(),
          },
          include: { test: true },
        });

        await this.recalculateCourseProgress(transaction, course, userId, courseId);

        return savedResult;
      },
    );
    const learningEntry = await this.getCourseLearningEntry(userId, courseId);

    return {
      result: this.mapTestResult(result),
      learningEntry,
      passingScore: moduleAndTest.test.passingScore,
    };
  }

  async getCourseLearningEntry(
    userId: string,
    courseId: string,
  ): Promise<UserLearningCourseResponse> {
    const progressRecord =
      await this.prismaService.userCourseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        include: userCourseProgressInclude,
      });

    if (!progressRecord) {
      throw new NotFoundException(
        `Learning progress for course "${courseId}" was not found.`,
      );
    }

    return this.mapCourseProgress(progressRecord);
  }

  private async ensureCourseProgress(
    transaction: Prisma.TransactionClient,
    userId: string,
    courseId: string,
  ) {
    const existingProgress = await transaction.userCourseProgress.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingProgress) {
      return existingProgress;
    }

    return transaction.userCourseProgress.create({
      data: {
        userId,
        courseId,
        status: 'in_progress',
        progressPercent: 0,
        startedAt: new Date(),
      },
    });
  }

  private async recalculateCourseProgress(
    transaction: Prisma.TransactionClient,
    course: CourseWithRelations,
    userId: string,
    courseId: string,
    lastLessonId?: string,
  ) {
    const progressRecord = await transaction.userCourseProgress.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        lessonProgresses: true,
        testResults: true,
      },
    });

    if (!progressRecord) {
      throw new NotFoundException(
        `Learning progress for course "${courseId}" was not found.`,
      );
    }

    const totalLessons = course.modules.reduce(
      (count, courseModule) => count + courseModule.lessons.length,
      0,
    );
    const totalTests = course.modules.length;
    const passedTests = progressRecord.testResults.filter((testResult) => {
      const matchingModule = course.modules.find(
        (courseModule) => courseModule.id === testResult.courseModuleId,
      );

      return (
        matchingModule?.test?.passingScore !== undefined &&
        testResult.score >= matchingModule.test.passingScore
      );
    }).length;
    const denominator = totalLessons + totalTests;
    const progressPercent =
      denominator === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              ((progressRecord.lessonProgresses.length + passedTests) /
                denominator) *
                100,
            ),
          );
    const hasActivity =
      Boolean(progressRecord.startedAt) ||
      progressRecord.lessonProgresses.length > 0 ||
      progressRecord.testResults.length > 0;
    const status =
      progressPercent >= 100
        ? 'completed'
        : hasActivity
          ? 'in_progress'
          : 'not_started';

    await transaction.userCourseProgress.update({
      where: {
        id: progressRecord.id,
      },
      data: {
        status,
        progressPercent,
        startedAt: progressRecord.startedAt ?? new Date(),
        completedAt:
          status === 'completed'
            ? (progressRecord.completedAt ?? new Date())
            : null,
        lastLessonId:
          lastLessonId !== undefined
            ? lastLessonId
            : progressRecord.lastLessonId,
      },
    });
  }

  private resolveLessonContext(course: CourseWithRelations, lessonId: string) {
    const orderedLessons = course.modules.flatMap((courseModule) =>
      courseModule.lessons.map((lesson) => ({
        lessonId: lesson.id,
        moduleId: courseModule.id,
      })),
    );
    const lessonIndex = orderedLessons.findIndex(
      (orderedLesson) => orderedLesson.lessonId === lessonId,
    );

    if (lessonIndex === -1) {
      throw new NotFoundException(
        `Lesson "${lessonId}" was not found in course "${course.id}".`,
      );
    }

    return {
      moduleId: orderedLessons[lessonIndex].moduleId,
      previousLessonId:
        lessonIndex > 0 ? orderedLessons[lessonIndex - 1].lessonId : undefined,
    };
  }

  private resolveModuleAndTest(
    course: CourseWithRelations,
    testOrModuleId: string,
  ) {
    const matchingModule = course.modules.find(
      (courseModule) =>
        courseModule.id === testOrModuleId ||
        courseModule.test?.id === testOrModuleId,
    );

    if (!matchingModule || !matchingModule.test) {
      throw new NotFoundException(
        `Test or module "${testOrModuleId}" was not found.`,
      );
    }

    return {
      module: matchingModule,
      test: matchingModule.test,
    };
  }

  private validateAnswersPayload(answers: Record<string, number>) {
    for (const [questionId, answerIndex] of Object.entries(answers)) {
      if (!Number.isInteger(answerIndex) || answerIndex < 0) {
        throw new BadRequestException(
          `Answer for question "${questionId}" must be a zero-based option index.`,
        );
      }
    }
  }

  private mapCourseProgress(
    progressRecord: UserCourseProgressWithRelations,
  ): UserLearningCourseResponse {
    return {
      courseId: progressRecord.courseId,
      status: progressRecord.status,
      progressPercent: progressRecord.progressPercent,
      completedLessonIds: progressRecord.lessonProgresses.map(
        (lessonProgress) => lessonProgress.lessonId,
      ),
      testResults: progressRecord.testResults.map((testResult) =>
        this.mapTestResult(testResult),
      ),
      startedAt: progressRecord.startedAt?.toISOString(),
      completedAt: progressRecord.completedAt?.toISOString(),
      lastLessonId: progressRecord.lastLessonId ?? undefined,
    };
  }

  private mapTestResult(
    testResult: TestResult & { test?: Test | null },
  ): ModuleTestResultResponse {
    return {
      moduleId: testResult.courseModuleId,
      score: testResult.score,
      correctAnswers: testResult.correctAnswers,
      totalQuestions: testResult.totalQuestions,
      submittedAt: testResult.submittedAt.toISOString(),
      answers: this.parseAnswersRecord(testResult.answers),
    };
  }

  private buildWeakTopics(
    progressRecords: UserCourseProgressWithRelations[],
  ): WeakTopicResponse[] {
    const aggregate = new Map<
      string,
      {
        wrong: number;
        total: number;
        relatedCourseIds: Set<string>;
      }
    >();

    for (const progressRecord of progressRecords) {
      for (const testResult of progressRecord.testResults) {
        const parsedAnswers = this.parseAnswersRecord(testResult.answers);

        for (const question of testResult.test.questions) {
          const correctOptionIndex = question.answers.findIndex(
            (answer) => answer.isCorrect,
          );
          const selectedOptionIndex = parsedAnswers[question.id];
          const topicStats = aggregate.get(question.topic) ?? {
            wrong: 0,
            total: 0,
            relatedCourseIds: new Set<string>(),
          };

          topicStats.total += 1;

          if (selectedOptionIndex !== correctOptionIndex) {
            topicStats.wrong += 1;
          }

          topicStats.relatedCourseIds.add(progressRecord.courseId);
          aggregate.set(question.topic, topicStats);
        }
      }
    }

    return [...aggregate.entries()]
      .filter(([, topicStats]) => topicStats.wrong > 0)
      .map(([label, topicStats]) => ({
        id: `weak-${this.toTopicSlug(label)}`,
        label,
        confidenceGap: Number((topicStats.wrong / topicStats.total).toFixed(2)),
        relatedCourseIds: [...topicStats.relatedCourseIds],
      }))
      .sort((left, right) => right.confidenceGap - left.confidenceGap)
      .slice(0, 8);
  }

  private parseAnswersRecord(
    answers: Prisma.JsonValue,
  ): Record<string, number> {
    if (!answers || Array.isArray(answers) || typeof answers !== 'object') {
      return {};
    }

    const normalizedAnswers: Record<string, number> = {};

    for (const [questionId, value] of Object.entries(answers)) {
      if (typeof value === 'number' && Number.isInteger(value)) {
        normalizedAnswers[questionId] = value;
        continue;
      }

      if (typeof value === 'string' && /^\d+$/.test(value)) {
        normalizedAnswers[questionId] = Number(value);
      }
    }

    return normalizedAnswers;
  }

  private toTopicSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
