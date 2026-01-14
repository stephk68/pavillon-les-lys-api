import { EventType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

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

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
