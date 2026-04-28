import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseQueryDto } from './dto/course-query.dto';
import {
  courseRelationsInclude,
  CourseResponse,
  CourseWithRelations,
  mapCourse,
} from './courses.mapper';

export interface CoursesCollectionResult {
  items: CourseResponse[];
  meta: {
    total: number;
    page?: number;
    limit?: number;
  };
}

@Injectable()
export class CoursesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(query?: CourseQueryDto): Promise<CoursesCollectionResult> {
    const where = this.buildWhereInput(query);
    const shouldPaginate =
      query?.page !== undefined || query?.limit !== undefined;
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 12;

    const [total, courses] = await Promise.all([
      this.prismaService.course.count({
        where,
      }),
      this.prismaService.course.findMany({
        where,
        include: courseRelationsInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip: shouldPaginate ? (page - 1) * limit : undefined,
        take: shouldPaginate ? limit : undefined,
      }),
    ]);

    return {
      items: courses.map((course) => mapCourse(course)),
      meta: {
        total,
        page: shouldPaginate ? page : undefined,
        limit: shouldPaginate ? limit : undefined,
      },
    };
  }

  async findOne(courseId: string): Promise<CourseResponse> {
    return mapCourse(await this.getCourseEntityById(courseId));
  }

  async getCourseEntityById(courseId: string): Promise<CourseWithRelations> {
    const course = await this.prismaService.course.findUnique({
      where: {
        id: courseId,
      },
      include: courseRelationsInclude,
    });

    if (!course) {
      throw new NotFoundException(`Course "${courseId}" was not found.`);
    }

    return course;
  }

  private buildWhereInput(query?: CourseQueryDto): Prisma.CourseWhereInput {
    const clauses: Prisma.CourseWhereInput[] = [];

    if (query?.difficulty) {
      clauses.push({
        difficulty: query.difficulty,
      });
    }

    if (query?.tags && query.tags.length > 0) {
      clauses.push({
        tags: {
          hasEvery: query.tags,
        },
      });
    }

    if (query?.search) {
      const search = query.search.trim();

      if (search.length > 0) {
        clauses.push({
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              shortDescription: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              embeddingText: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              tags: {
                has: search.toLowerCase(),
              },
            },
          ],
        });
      }
    }

    if (clauses.length === 0) {
      return {};
    }

    return {
      AND: clauses,
    };
  }
}
