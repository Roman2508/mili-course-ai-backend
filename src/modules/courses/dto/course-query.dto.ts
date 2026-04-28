import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DifficultyLevel } from '../../../generated/prisma/client';

export class CourseQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.flatMap((item: string) =>
        item
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      );
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
    }

    return undefined;
  })
  tags?: string[];
}
