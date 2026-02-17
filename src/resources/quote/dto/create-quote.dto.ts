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
    IsUUID,
    Min,
    ValidateNested,
} from "class-validator";

export class QuoteItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

/**
 * Détails de l'événement pour les devis standalone
 * Stockés en JSON dans Quote.eventDetails
 */
export class EventDetailsDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsDateString()
  desiredStartDate: string;

  @IsDateString()
  desiredEndDate: string;

  @IsInt()
  @Min(1)
  attendees: number;
}

export class CreateQuoteDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  reservationId?: string; // Optionnel - mode Funnel standalone

  @IsOptional()
  @ValidateNested()
  @Type(() => EventDetailsDto)
  eventDetails?: EventDetailsDto; // Nouveau - pour devis standalone

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsDateString()
  validUntil: string;
}
