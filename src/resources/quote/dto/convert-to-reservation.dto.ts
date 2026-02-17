import { IsOptional, IsString } from "class-validator";

/**
 * DTO pour la conversion d'un devis ACCEPTED en réservation
 * Les données principales (dates, type, participants) viennent de Quote.eventDetails
 */
export class ConvertToReservationDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
