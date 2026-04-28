import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CourseQueryDto } from '../courses/dto/course-query.dto';
import {
  CreateCourseDto,
  UpdateCourseDto,
} from '../courses/dto/course-payload.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('courses')
  async getCourses(
    @Query() query: CourseQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.adminService.getCourses(query);

    response.setHeader('X-Total-Count', String(result.meta.total));

    if (result.meta.page !== undefined) {
      response.setHeader('X-Page', String(result.meta.page));
    }

    if (result.meta.limit !== undefined) {
      response.setHeader('X-Limit', String(result.meta.limit));
    }

    return result.items;
  }

  @Get('courses/:id')
  async getCourse(@Param('id') courseId: string) {
    return this.adminService.getCourse(courseId);
  }

  @Post('courses')
  async createCourse(@Body() dto: CreateCourseDto) {
    return this.adminService.createCourse(dto);
  }

  @Patch('courses/:id')
  @Put('courses/:id')
  async updateCourse(
    @Param('id') courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.adminService.updateCourse(courseId, dto);
  }

  @Delete('courses/:id')
  async deleteCourse(@Param('id') courseId: string) {
    return this.adminService.deleteCourse(courseId);
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  async getUser(@Param('id') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch('users/:id')
  @Put('users/:id')
  async updateUser(
    @Param('id') userId: string,
    @Body() dto: UpdateAdminUserDto,
    @Req() request: Request,
  ) {
    return this.adminService.updateUser(userId, dto, request);
  }
}
