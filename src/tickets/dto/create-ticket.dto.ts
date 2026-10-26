import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRIORITIES, type Priority } from '../ticket.model.js';

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 МБ (10_485_760 байтів)

export class AttachmentDto {
  @IsUrl({}, { message: 'url має бути коректною URL-адресою' })
  url: string;

  @IsInt()
  @Min(1)
  @Max(MAX_ATTACHMENT_SIZE)
  size: number;
}

export class CreateTicketDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(PRIORITIES, {
    message: `Пріоритет має бути одним із: ${PRIORITIES.join(', ')}`,
  })
  priority: Priority;

  @IsInt()
  @Min(1)
  authorId: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
