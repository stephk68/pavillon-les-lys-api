import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";

export class CreateChekclistItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  reservationId: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
