import { EventType } from "@prisma/client";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateReservationBackOfficeDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsInt()
  @Min(1)
  attendees: number;

  // Informations client pour le back-office
  @IsEmail()
  clientEmail: string;

  @IsString()
  clientFirstName: string;

  @IsString()
  clientLastName: string;

  @IsString()
  clientPhone: string;

  // Champs optionnels pour la réservation
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedBudget?: number;
}
