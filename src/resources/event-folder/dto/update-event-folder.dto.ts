import { EventType } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from "class-validator";
import { EventFolderItemDto, EventScheduleDto } from "./create-event-folder.dto";

export class UpdateEventFolderDto {
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventScheduleDto)
  schedules?: EventScheduleDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  attendees?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventFolderItemDto)
  items?: EventFolderItemDto[];

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  // Tarification globale : montant total HT négocié + remise.
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  // New Pricing Fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cautionAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingBalance?: number;
}
