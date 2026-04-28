import { IsString, MinLength } from 'class-validator';

export class MarkLessonCompletedDto {
  @IsString()
  @MinLength(3)
  courseId!: string;
}
