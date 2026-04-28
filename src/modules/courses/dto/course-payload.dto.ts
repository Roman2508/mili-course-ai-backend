import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DifficultyLevel,
  LessonContentType,
} from '../../../generated/prisma/client';

export class GeneratedEmbeddingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  model!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber(
    {
      allowInfinity: false,
      allowNaN: false,
      maxDecimalPlaces: 10,
    },
    { each: true },
  )
  vector!: number[];

  @IsInt()
  @Min(1)
  dimension!: number;

  @IsISO8601()
  generatedAt!: string;
}

export class CourseLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  summary!: string;

  @IsEnum(LessonContentType)
  contentType!: LessonContentType;

  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes!: number;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  videoUrl?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(3000, { each: true })
  contentBlocks!: string[];
}

export class CourseQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  prompt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  topic!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctOptionIndex!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(1200)
  explanation!: string;
}

export class CourseModuleTestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  description!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  passingScore!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseQuestionDto)
  questions!: CourseQuestionDto[];
}

export class CourseModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  description!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseLessonDto)
  lessons!: CourseLessonDto[];

  @ValidateNested()
  @Type(() => CourseModuleTestDto)
  test!: CourseModuleTestDto;
}

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  shortDescription!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item: string) => item.trim().toLowerCase()).filter(Boolean)
      : [],
  )
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags!: string[];

  @IsEnum(DifficultyLevel)
  difficulty!: DifficultyLevel;

  @IsUrl({
    require_protocol: true,
  })
  coverImage!: string;

  @IsInt()
  @Min(1)
  @Max(500)
  estimatedHours!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseModuleDto)
  modules!: CourseModuleDto[];

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  embeddingText!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeneratedEmbeddingDto)
  generatedEmbedding?: GeneratedEmbeddingDto | null;
}

export class UpdateCourseDto extends CreateCourseDto {}
