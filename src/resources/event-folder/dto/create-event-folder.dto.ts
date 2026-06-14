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

  // Prix unitaire optionnel : la tarification du devis est désormais un
  // montant global (totalAmount) + remise. Les lignes ne portent que
  // description + quantité.
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class EventScheduleDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventScheduleDto)
  schedules: EventScheduleDto[];

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
