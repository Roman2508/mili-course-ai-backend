import { Module } from '@nestjs/common';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LearningModule } from './modules/learning/learning.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { TestsModule } from './modules/tests/tests.module';
import { UsersModule } from './modules/users/users.module';
import { AppConfigModule } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    LearningModule,
    LessonsModule,
    TestsModule,
    RecommendationsModule,
    AdminModule,
  ],
})
export class AppModule {}
