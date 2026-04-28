import type {
  DifficultyLevel,
  LessonContentType,
  Prisma,
} from '../../generated/prisma/client';

export interface GeneratedEmbeddingResponse {
  model: string;
  vector: number[];
  dimension: number;
  generatedAt: string;
}

export interface CourseLessonResponse {
  id: string;
  title: string;
  summary: string;
  contentType: LessonContentType;
  durationMinutes: number;
  videoUrl?: string;
  contentBlocks: string[];
}

export interface CourseTestQuestionResponse {
  id: string;
  prompt: string;
  topic: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface CourseModuleTestResponse {
  id: string;
  title: string;
  description: string;
  passingScore: number;
  questions: CourseTestQuestionResponse[];
}

export interface CourseModuleResponse {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLessonResponse[];
  test: CourseModuleTestResponse;
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  tags: string[];
  difficulty: DifficultyLevel;
  coverImage: string;
  estimatedHours: number;
  modules: CourseModuleResponse[];
  embeddingText: string;
  generatedEmbedding: GeneratedEmbeddingResponse | null;
}

export const courseRelationsInclude = {
  modules: {
    orderBy: {
      order: 'asc',
    },
    include: {
      lessons: {
        orderBy: {
          order: 'asc',
        },
      },
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
} satisfies Prisma.CourseInclude;

export type CourseWithRelations = Prisma.CourseGetPayload<{
  include: typeof courseRelationsInclude;
}>;

export function mapCourse(course: CourseWithRelations): CourseResponse {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    shortDescription: course.shortDescription,
    tags: course.tags,
    difficulty: course.difficulty,
    coverImage: course.coverImage,
    estimatedHours: course.estimatedHours,
    embeddingText: course.embeddingText,
    generatedEmbedding:
      course.generatedEmbeddingVector.length > 0
        ? {
            model:
              course.generatedEmbeddingModel ??
              'Xenova/all-MiniLM-L6-v2',
            vector: course.generatedEmbeddingVector,
            dimension:
              course.generatedEmbeddingDimension ??
              course.generatedEmbeddingVector.length,
            generatedAt: (
              course.generatedEmbeddingGeneratedAt ?? course.updatedAt
            ).toISOString(),
          }
        : null,
    modules: course.modules.map((courseModule) => {
      if (!courseModule.test) {
        throw new Error(
          `Course module ${courseModule.id} is missing a test definition.`,
        );
      }

      return {
        id: courseModule.id,
        title: courseModule.title,
        description: courseModule.description,
        order: courseModule.order,
        lessons: courseModule.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          summary: lesson.summary,
          contentType: lesson.contentType,
          durationMinutes: lesson.durationMinutes,
          videoUrl: lesson.videoUrl ?? undefined,
          contentBlocks: lesson.contentBlocks,
        })),
        test: {
          id: courseModule.test.id,
          title: courseModule.test.title,
          description: courseModule.test.description,
          passingScore: courseModule.test.passingScore,
          questions: courseModule.test.questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            topic: question.topic,
            options: question.answers.map((answer) => answer.text),
            correctOptionIndex: question.answers.findIndex(
              (answer) => answer.isCorrect,
            ),
            explanation: question.explanation,
          })),
        },
      };
    }),
  };
}
