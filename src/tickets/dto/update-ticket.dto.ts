import { PartialType, PickType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto.js';

export class UpdateTicketDto extends PartialType(
  PickType(CreateTicketDto, [
    'title',
    'description',
    'priority',
    'tags',
  ] as const),
) {
  @IsOptional()
  @ValidateIf((_, value) => value !== null) // null – зняти виконавця
  @IsInt()
  @Min(1)
  assigneeId?: number | null;
}
