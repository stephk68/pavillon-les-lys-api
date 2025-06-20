import { EventType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, Min } from 'class-validator';

export class CreateReservationDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsInt()
  @Min(1)
  attendees: number;
}
