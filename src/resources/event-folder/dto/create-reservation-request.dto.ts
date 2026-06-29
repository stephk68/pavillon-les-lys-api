import { EventType } from "@prisma/client";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateReservationRequestDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(EventType)
  eventType: EventType;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  guestCount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
