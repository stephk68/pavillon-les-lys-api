import { EventType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class EventFolderItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateEventFolderDto {
  // Client — either provide userId or client info for auto-creation
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientFirstName?: string;

  @IsOptional()
  @IsString()
  clientLastName?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  // Event info
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
  description?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  // Quote items (optional at creation)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventFolderItemDto)
  items?: EventFolderItemDto[];

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
