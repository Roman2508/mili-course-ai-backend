import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import type { LearningCourseStatus, Prisma } from '../src/generated/prisma/client';
import { createBetterAuth } from '../src/modules/auth/better-auth.config';
import { createPrismaPgAdapter } from '../src/prisma/prisma-adapter.factory';
import {
  seedCourses,
  seedProgressByEmail,
  seedUsers,
  type SeedCourse,
  type SeedCourseModule,
  type SeedCourseProgress,
  type SeedTestAttempt,
} from './seed-data';

const seedHeaders = new Headers({
  origin: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  referer: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  'user-agent': 'mili-course-ai-seed',
  'x-forwarded-for': '127.0.0.1',
});

interface LessonContext {
  courseId: string;
  moduleId: string;
  lessonId: string;
  globalOrder: number;
}

interface TestContext {
  courseId: string;
  moduleId: string;
  testId: string;
  passingScore: number;
  questions: SeedCourseModule['test']['questions'];
}

interface CourseIndex {
  lessonContexts: Map<string, LessonContext>;
  testContexts: Map<string, TestContext>;
  courseById: Map<string, SeedCourse>;
}

function buildAnswerId(questionId: string, optionIndex: number) {
  return `${questionId}-answer-${optionIndex + 1}`;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildCourseIndex(courses: SeedCourse[]): CourseIndex {
  const lessonContexts = new Map<string, LessonContext>();
  const testContexts = new Map<string, TestContext>();
  const courseById = new Map<string, SeedCourse>();

  for (const course of courses) {
    courseById.set(course.id, course);

    let globalOrder = 0;

    for (const courseModule of course.modules) {
      for (const lesson of courseModule.lessons) {
        globalOrder += 1;
        lessonContexts.set(lesson.id, {
          courseId: course.id,
          moduleId: courseModule.id,
          lessonId: lesson.id,
          globalOrder,
        });
      }

      testContexts.set(courseModule.test.id, {
        courseId: course.id,
        moduleId: courseModule.id,
        testId: courseModule.test.id,
        passingScore: courseModule.test.passingScore,
        questions: courseModule.test.questions,
      });
    }
  }

  return {
    lessonContexts,
    testContexts,
    courseById,
  };
}

function calculateTestResult(testContext: TestContext, answers: Record<string, number>) {
  const totalQuestions = testContext.questions.length;
  const correctAnswers = testContext.questions.reduce((score, question) => {
    return score + Number(answers[question.id] === question.correctOptionIndex);
  }, 0);
  const percentageScore =
    totalQuestions === 0
      ? 0
      : Math.round((correctAnswers / totalQuestions) * 100);

  return {
    correctAnswers,
    totalQuestions,
    percentageScore,
  };
}

function determineProgressStatus(input: {
  course: SeedCourse;
  completedLessonIds: string[];
  testAttempts: SeedTestAttempt[];
  testContexts: Map<string, TestContext>;
}): {
  status: LearningCourseStatus;
  progressPercent: number;
  completedAt: Date | null;
} {
  const totalLessons = input.course.modules.reduce((sum, module) => {
    return sum + module.lessons.length;
  }, 0);
  const totalTests = input.course.modules.length;
  const passedTests = input.testAttempts.reduce((sum, attempt) => {
    const testContext = input.testContexts.get(attempt.testId);

    if (!testContext) {
      return sum;
    }

    const result = calculateTestResult(testContext, attempt.answers);
    return sum + Number(result.percentageScore >= testContext.passingScore);
  }, 0);
  const denominator = totalLessons + totalTests;
  const progressPercent =
    denominator === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            ((input.completedLessonIds.length + passedTests) / denominator) * 100,
          ),
        );
  const hasActivity =
    input.completedLessonIds.length > 0 || input.testAttempts.length > 0;
  const status: LearningCourseStatus =
    progressPercent >= 100
      ? 'completed'
      : hasActivity
        ? 'in_progress'
        : 'not_started';
  const completedAt =
    status === 'completed' && input.testAttempts.length > 0
      ? new Date(input.testAttempts[input.testAttempts.length - 1].submittedAt)
      : null;

  return {
    status,
    progressPercent,
    completedAt,
  };
}

async function resetSeededRecords(prisma: PrismaClient) {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: seedUsers.map((user) => user.email),
      },
    },
  });

  await prisma.course.deleteMany({
    where: {
      id: {
        startsWith: 'seed-course-',
      },
    },
  });
}

async function seedDemoUsers(
  prisma: PrismaClient,
): Promise<Map<string, { id: string; email: string }>> {
  const auth = createBetterAuth(prisma, {
    baseURL: getRequiredEnv('BETTER_AUTH_URL'),
    secret: getRequiredEnv('BETTER_AUTH_SECRET'),
    trustedOrigins: [getRequiredEnv('FRONTEND_ORIGIN')],
    isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  });
  const usersByEmail = new Map<string, { id: string; email: string }>();

  for (const seedUser of seedUsers) {
    const { response } = await auth.api.signUpEmail({
      headers: seedHeaders,
      body: {
        name: seedUser.name,
        email: seedUser.email,
        password: seedUser.password,
      },
      returnHeaders: true,
    });

    await prisma.user.update({
      where: {
        id: response.user.id,
      },
      data: {
        role: seedUser.role,
        interests: seedUser.interests,
        profileSummary: seedUser.profileSummary,
        emailVerified: seedUser.emailVerified,
      },
    });

    await prisma.session.deleteMany({
      where: {
        userId: response.user.id,
      },
    });

    usersByEmail.set(seedUser.email, {
      id: response.user.id,
      email: seedUser.email,
    });
  }

  return usersByEmail;
}

async function seedCoursesGraph(prisma: PrismaClient) {
  for (const course of seedCourses) {
    await prisma.course.create({
      data: {
        id: course.id,
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription,
        tags: course.tags,
        difficulty: course.difficulty,
        coverImage: course.coverImage,
        estimatedHours: course.estimatedHours,
        embeddingText: course.embeddingText,
        generatedEmbeddingModel: course.generatedEmbedding.model,
        generatedEmbeddingVector: course.generatedEmbedding.vector,
        generatedEmbeddingDimension: course.generatedEmbedding.dimension,
        generatedEmbeddingGeneratedAt: new Date(
          course.generatedEmbedding.generatedAt,
        ),
        modules: {
          create: course.modules.map((courseModule) => ({
            id: courseModule.id,
            title: courseModule.title,
            description: courseModule.description,
            order: courseModule.order,
            lessons: {
              create: courseModule.lessons.map((lesson, lessonIndex) => ({
                id: lesson.id,
                title: lesson.title,
                summary: lesson.summary,
                contentType: lesson.contentType,
                durationMinutes: lesson.durationMinutes,
                videoUrl: lesson.videoUrl ?? null,
                contentBlocks: lesson.contentBlocks,
                order: lessonIndex + 1,
              })),
            },
            test: {
              create: {
                id: courseModule.test.id,
                title: courseModule.test.title,
                description: courseModule.test.description,
                passingScore: courseModule.test.passingScore,
                questions: {
                  create: courseModule.test.questions.map(
                    (question, questionIndex) => ({
                      id: question.id,
                      prompt: question.prompt,
                      topic: question.topic,
                      explanation: question.explanation,
                      order: questionIndex + 1,
                      answers: {
                        create: question.options.map((option, optionIndex) => ({
                          id: buildAnswerId(question.id, optionIndex),
                          text: option,
                          order: optionIndex,
                          isCorrect:
                            optionIndex === question.correctOptionIndex,
                        })),
                      },
                    }),
                  ),
                },
              },
            },
          })),
        },
      },
    });
  }
}

async function seedLearningProgress(
  prisma: PrismaClient,
  usersByEmail: Map<string, { id: string; email: string }>,
  courseIndex: CourseIndex,
) {
  for (const [email, progressEntries] of Object.entries(seedProgressByEmail)) {
    const user = usersByEmail.get(email);

    if (!user) {
      throw new Error(`Seed user "${email}" was not created.`);
    }

    for (const progressSeed of progressEntries) {
      const course = courseIndex.courseById.get(progressSeed.courseId);

      if (!course) {
        throw new Error(`Seed course "${progressSeed.courseId}" was not found.`);
      }

      const orderedLessons = [...progressSeed.completedLessonIds].sort(
        (left, right) => {
          const leftContext = courseIndex.lessonContexts.get(left);
          const rightContext = courseIndex.lessonContexts.get(right);

          return (leftContext?.globalOrder ?? 0) - (rightContext?.globalOrder ?? 0);
        },
      );
      const progressMetrics = determineProgressStatus({
        course,
        completedLessonIds: orderedLessons,
        testAttempts: progressSeed.testAttempts,
        testContexts: courseIndex.testContexts,
      });
      const courseProgress = await prisma.userCourseProgress.create({
        data: {
          userId: user.id,
          courseId: progressSeed.courseId,
          status: progressMetrics.status,
          progressPercent: progressMetrics.progressPercent,
          startedAt: new Date(progressSeed.startedAt),
          completedAt: progressMetrics.completedAt,
          lastLessonId: orderedLessons.at(-1) ?? null,
        },
      });

      for (const [index, lessonId] of orderedLessons.entries()) {
        const lessonContext = courseIndex.lessonContexts.get(lessonId);

        if (!lessonContext) {
          throw new Error(`Seed lesson "${lessonId}" was not found.`);
        }

        await prisma.userLessonProgress.create({
          data: {
            userId: user.id,
            courseId: progressSeed.courseId,
            courseModuleId: lessonContext.moduleId,
            lessonId,
            courseProgressId: courseProgress.id,
            completedAt: new Date(
              new Date(progressSeed.startedAt).getTime() + (index + 1) * 60 * 60 * 1000,
            ),
          },
        });
      }

      for (const testAttempt of progressSeed.testAttempts) {
        const testContext = courseIndex.testContexts.get(testAttempt.testId);

        if (!testContext) {
          throw new Error(`Seed test "${testAttempt.testId}" was not found.`);
        }

        const score = calculateTestResult(testContext, testAttempt.answers);

        await prisma.testResult.create({
          data: {
            userId: user.id,
            courseId: progressSeed.courseId,
            courseModuleId: testContext.moduleId,
            testId: testContext.testId,
            courseProgressId: courseProgress.id,
            score: score.percentageScore,
            correctAnswers: score.correctAnswers,
            totalQuestions: score.totalQuestions,
            answers: testAttempt.answers as Prisma.InputJsonValue,
            submittedAt: new Date(testAttempt.submittedAt),
          },
        });
      }
    }
  }
}

async function main() {
  getRequiredEnv('DATABASE_URL');
  getRequiredEnv('BETTER_AUTH_SECRET');
  getRequiredEnv('BETTER_AUTH_URL');
  getRequiredEnv('FRONTEND_ORIGIN');

  const { adapter, pool } = createPrismaPgAdapter(getRequiredEnv('DATABASE_URL'));
  const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  try {
    await prisma.$connect();
    await resetSeededRecords(prisma);

    const usersByEmail = await seedDemoUsers(prisma);
    await seedCoursesGraph(prisma);
    await seedLearningProgress(prisma, usersByEmail, buildCourseIndex(seedCourses));

    console.log(
      `Seed complete: ${seedUsers.length} users, ${seedCourses.length} courses, ${Object.values(seedProgressByEmail).flat().length} progress tracks.`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed.');
  console.error(error);
  process.exit(1);
});
