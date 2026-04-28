import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function normalizeInterests(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueInterests = new Map<string, string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const normalizedInterest = item.replace(/\s+/g, ' ').trim();

    if (normalizedInterest.length === 0) {
      continue;
    }

    const dedupeKey = normalizedInterest.toLowerCase();

    if (!uniqueInterests.has(dedupeKey)) {
      uniqueInterests.set(dedupeKey, normalizedInterest);
    }
  }

  return [...uniqueInterests.values()];
}

export class UpdateProfileDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(600)
  profileSummary!: string;

  @Transform(({ value }) => normalizeInterests(value))
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(48, { each: true })
  interests!: string[];
}
