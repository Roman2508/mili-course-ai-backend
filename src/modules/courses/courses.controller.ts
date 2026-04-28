import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CourseQueryDto } from './dto/course-query.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(AuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findMany(
    @Query() query: CourseQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.coursesService.findMany(query);

    response.setHeader('X-Total-Count', String(result.meta.total));

    if (result.meta.page !== undefined) {
      response.setHeader('X-Page', String(result.meta.page));
    }

    if (result.meta.limit !== undefined) {
      response.setHeader('X-Limit', String(result.meta.limit));
    }

    return result.items;
  }

  @Get(':id')
  async findOne(@Param('id') courseId: string) {
    return this.coursesService.findOne(courseId);
  }
}
