import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { APIError } from 'better-auth/api';
import type { Request } from 'express';
import type { Prisma } from '../../generated/prisma/client';
import { toHeaders } from '../../common/utils/http.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BetterAuthService } from '../auth/better-auth.service';
import { CourseQueryDto } from '../courses/dto/course-query.dto';
import {
  CreateCourseDto,
  UpdateCourseDto,
} from '../courses/dto/course-payload.dto';
import { CoursesService } from '../courses/courses.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

type CourseRootWriteData = Omit<Prisma.CourseUncheckedCreateInput, 'id'>;

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  role: true,
  interests: true,
  profileSummary: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly betterAuthService: BetterAuthService,
  ) {}

  async getCourses(query?: CourseQueryDto) {
    return this.coursesService.findMany(query);
  }

  async getCourse(courseId: string) {
    return this.coursesService.findOne(courseId);
  }

  async createCourse(dto: CreateCourseDto) {
    this.assertCoursePayloadIntegrity(dto);

    const courseId = `course-${randomUUID()}`;

    await this.prismaService.$transaction(
      async (transaction) => {
        await transaction.course.create({
          data: {
            id: courseId,
            ...this.mapCourseRootData(dto),
          },
        });

        await this.syncCourseGraph(transaction, courseId, dto);
      },
      {
        maxWait: 20_000,
        timeout: 20_000,
      },
    );

    return this.coursesService.findOne(courseId);
  }

  async updateCourse(courseId: string, dto: UpdateCourseDto) {
    this.assertCoursePayloadIntegrity(dto);

    const existingCourse = await this.prismaService.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
      },
    });

    if (!existingCourse) {
      throw new NotFoundException(`Course "${courseId}" was not found.`);
    }

    await this.prismaService.$transaction(
      async (transaction) => {
        await transaction.course.update({
          where: {
            id: courseId,
          },
          data: this.mapCourseRootData(dto),
        });

        await this.syncCourseGraph(transaction, courseId, dto);
      },
      {
        maxWait: 20_000,
        timeout: 20_000,
      },
    );

    return this.coursesService.findOne(courseId);
  }

  async deleteCourse(courseId: string) {
    await this.prismaService.course.delete({
      where: {
        id: courseId,
      },
    });

    return {
      success: true,
    };
  }

  async getUsers() {
    return this.prismaService.user.findMany({
      select: adminUserSelect,
      orderBy: [{ role: 'desc' }, { updatedAt: 'desc' }, { name: 'asc' }],
    });
  }

  async getUser(userId: string) {
    return this.findUserOrThrow(userId);
  }

  async updateUser(
    userId: string,
    dto: UpdateAdminUserDto,
    request: Request,
  ) {
    const existingUser = await this.findUserOrThrow(userId);
    const headers = toHeaders(request.headers);
    const nextName = dto.name.trim();
    const nextEmail = dto.email.trim().toLowerCase();
    const nextRole = dto.role;
    const nextProfileSummary = dto.profileSummary.trim();
    const nextInterests = dto.interests;
    const nextPassword =
      typeof dto.password === 'string' && dto.password.length > 0
        ? dto.password
        : undefined;

    await this.assertAdminRoleIntegrity(existingUser.role, nextRole);

    const shouldUpdateAuthUser =
      existingUser.name !== nextName ||
      existingUser.email.toLowerCase() !== nextEmail ||
      existingUser.role !== nextRole;

    if (shouldUpdateAuthUser) {
      await this.updateAuthUser(headers, userId, {
        name: nextName,
        email: nextEmail,
        role: nextRole,
      });
    }

    if (nextPassword) {
      await this.setUserPassword(headers, userId, nextPassword);
    }

    const shouldUpdateProfileFields =
      existingUser.profileSummary !== nextProfileSummary ||
      !this.areArraysEqual(existingUser.interests, nextInterests);

    if (shouldUpdateProfileFields) {
      await this.prismaService.user.update({
        where: {
          id: userId,
        },
        data: {
          interests: nextInterests,
          profileSummary: nextProfileSummary,
        },
      });
    }

    return this.findUserOrThrow(userId);
  }

  private async syncCourseGraph(
    transaction: Prisma.TransactionClient,
    courseId: string,
    dto: CreateCourseDto | UpdateCourseDto,
  ) {
    const moduleIds = dto.modules.map((courseModule) => courseModule.id);

    await transaction.courseModule.deleteMany({
      where: {
        courseId,
        id: {
          notIn: moduleIds,
        },
      },
    });

    for (const courseModule of dto.modules) {
      await transaction.courseModule.upsert({
        where: {
          id: courseModule.id,
        },
        create: {
          id: courseModule.id,
          courseId,
          title: courseModule.title,
          description: courseModule.description,
          order: courseModule.order,
        },
        update: {
          courseId,
          title: courseModule.title,
          description: courseModule.description,
          order: courseModule.order,
        },
      });

      const lessonIds = courseModule.lessons.map((lesson) => lesson.id);

      await transaction.lesson.deleteMany({
        where: {
          courseModuleId: courseModule.id,
          id: {
            notIn: lessonIds,
          },
        },
      });

      for (const [lessonIndex, lesson] of courseModule.lessons.entries()) {
        await transaction.lesson.upsert({
          where: {
            id: lesson.id,
          },
          create: {
            id: lesson.id,
            courseModuleId: courseModule.id,
            title: lesson.title,
            summary: lesson.summary,
            contentType: lesson.contentType,
            durationMinutes: lesson.durationMinutes,
            videoUrl: lesson.videoUrl ?? null,
            contentBlocks: lesson.contentBlocks,
            order: lessonIndex + 1,
          },
          update: {
            courseModuleId: courseModule.id,
            title: lesson.title,
            summary: lesson.summary,
            contentType: lesson.contentType,
            durationMinutes: lesson.durationMinutes,
            videoUrl: lesson.videoUrl ?? null,
            contentBlocks: lesson.contentBlocks,
            order: lessonIndex + 1,
          },
        });
      }

      const persistedTest = await transaction.test.upsert({
        where: {
          courseModuleId: courseModule.id,
        },
        create: {
          id: courseModule.test.id,
          courseModuleId: courseModule.id,
          title: courseModule.test.title,
          description: courseModule.test.description,
          passingScore: courseModule.test.passingScore,
        },
        update: {
          id: courseModule.test.id,
          title: courseModule.test.title,
          description: courseModule.test.description,
          passingScore: courseModule.test.passingScore,
        },
      });
      const questionIds = courseModule.test.questions.map(
        (question) => question.id,
      );

      await transaction.question.deleteMany({
        where: {
          testId: persistedTest.id,
          id: {
            notIn: questionIds,
          },
        },
      });

      for (const [questionIndex, question] of courseModule.test.questions.entries()) {
        await transaction.question.upsert({
          where: {
            id: question.id,
          },
          create: {
            id: question.id,
            testId: persistedTest.id,
            prompt: question.prompt,
            topic: question.topic,
            explanation: question.explanation,
            order: questionIndex + 1,
          },
          update: {
            testId: persistedTest.id,
            prompt: question.prompt,
            topic: question.topic,
            explanation: question.explanation,
            order: questionIndex + 1,
          },
        });

        const answerIds = question.options.map((_, optionIndex) =>
          this.buildAnswerId(question.id, optionIndex),
        );

        await transaction.answer.deleteMany({
          where: {
            questionId: question.id,
            id: {
              notIn: answerIds,
            },
          },
        });

        for (const [optionIndex, option] of question.options.entries()) {
          await transaction.answer.upsert({
            where: {
              id: this.buildAnswerId(question.id, optionIndex),
            },
            create: {
              id: this.buildAnswerId(question.id, optionIndex),
              questionId: question.id,
              text: option,
              order: optionIndex,
              isCorrect: optionIndex === question.correctOptionIndex,
            },
            update: {
              questionId: question.id,
              text: option,
              order: optionIndex,
              isCorrect: optionIndex === question.correctOptionIndex,
            },
          });
        }
      }
    }
  }

  private mapCourseRootData(
    dto: CreateCourseDto | UpdateCourseDto,
  ): CourseRootWriteData {
    return {
      title: dto.title.trim(),
      description: dto.description.trim(),
      shortDescription: dto.shortDescription.trim(),
      tags: dto.tags.map((tag) => tag.trim().toLowerCase()),
      difficulty: dto.difficulty,
      coverImage: dto.coverImage,
      estimatedHours: dto.estimatedHours,
      embeddingText: dto.embeddingText.trim(),
      generatedEmbeddingModel: dto.generatedEmbedding?.model ?? null,
      generatedEmbeddingVector: dto.generatedEmbedding?.vector ?? [],
      generatedEmbeddingDimension:
        dto.generatedEmbedding?.dimension ?? null,
      generatedEmbeddingGeneratedAt: dto.generatedEmbedding?.generatedAt
        ? new Date(dto.generatedEmbedding.generatedAt)
        : null,
    };
  }

  private assertCoursePayloadIntegrity(
    dto: CreateCourseDto | UpdateCourseDto,
  ) {
    const moduleIds = new Set<string>();
    const lessonIds = new Set<string>();
    const testIds = new Set<string>();
    const questionIds = new Set<string>();

    for (const courseModule of dto.modules) {
      if (moduleIds.has(courseModule.id)) {
        throw new BadRequestException(
          `Duplicate module id "${courseModule.id}" in payload.`,
        );
      }

      moduleIds.add(courseModule.id);

      if (testIds.has(courseModule.test.id)) {
        throw new BadRequestException(
          `Duplicate test id "${courseModule.test.id}" in payload.`,
        );
      }

      testIds.add(courseModule.test.id);

      for (const lesson of courseModule.lessons) {
        if (lessonIds.has(lesson.id)) {
          throw new BadRequestException(
            `Duplicate lesson id "${lesson.id}" in payload.`,
          );
        }

        lessonIds.add(lesson.id);
      }

      for (const question of courseModule.test.questions) {
        if (questionIds.has(question.id)) {
          throw new BadRequestException(
            `Duplicate question id "${question.id}" in payload.`,
          );
        }

        if (
          question.correctOptionIndex < 0 ||
          question.correctOptionIndex >= question.options.length
        ) {
          throw new BadRequestException(
            `Question "${question.id}" has an invalid correctOptionIndex.`,
          );
        }

        questionIds.add(question.id);
      }
    }
  }

  private buildAnswerId(questionId: string, optionIndex: number) {
    return `${questionId}-answer-${optionIndex + 1}`;
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: adminUserSelect,
    });

    if (!user) {
      throw new NotFoundException(`User "${userId}" was not found.`);
    }

    return user;
  }

  private async assertAdminRoleIntegrity(
    currentRole: 'student' | 'admin',
    nextRole: 'student' | 'admin',
  ) {
    if (currentRole !== 'admin' || nextRole === 'admin') {
      return;
    }

    await this.ensureAtLeastOneAdminRemains();
  }

  private async ensureAtLeastOneAdminRemains() {
    const adminsCount = await this.prismaService.user.count({
      where: {
        role: 'admin',
      },
    });

    if (adminsCount <= 1) {
      throw new BadRequestException(
        'At least one administrator must remain in the system.',
      );
    }
  }

  private async updateAuthUser(
    headers: Headers,
    userId: string,
    data: {
      name: string;
      email: string;
      role: 'student' | 'admin';
    },
  ) {
    try {
      await this.betterAuthService.api.adminUpdateUser({
        headers,
        body: {
          userId,
          data,
        },
      });
    } catch (error) {
      this.handleBetterAuthError(error);
    }
  }

  private async setUserPassword(
    headers: Headers,
    userId: string,
    newPassword: string,
  ) {
    try {
      await this.betterAuthService.api.setUserPassword({
        headers,
        body: {
          userId,
          newPassword,
        },
      });
    } catch (error) {
      this.handleBetterAuthError(error);
    }
  }

  private areArraysEqual(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => item === right[index]);
  }

  private handleBetterAuthError(error: unknown): never {
    if (error instanceof APIError) {
      throw new HttpException(
        {
          message: error.message,
          details: error.body ?? null,
        },
        typeof error.status === 'number'
          ? error.status
          : HttpStatus.BAD_REQUEST,
      );
    }

    throw error;
  }
}
