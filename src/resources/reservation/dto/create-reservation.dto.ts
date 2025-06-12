import { EventType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsDateString()
  start: Date;

  @IsDateString()
  end: Date;

  @IsInt()
  @Min(1)
  attendees: number;

  @IsString()
  notes?: string;
}
