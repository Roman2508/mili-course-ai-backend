import { Transform } from 'class-transformer';
import { IsObject, IsString, MinLength } from 'class-validator';

export class SubmitTestDto {
  @IsString()
  @MinLength(3)
  courseId!: string;

  @IsObject()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).map(([questionId, answerIndex]) => [
        questionId,
        Number(answerIndex),
      ]),
    );
  })
  answers!: Record<string, number>;
}
