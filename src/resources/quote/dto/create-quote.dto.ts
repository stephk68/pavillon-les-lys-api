import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuoteDto {
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  currency?: string = 'XOF';

  @IsOptional()
  @IsUUID()
  reservationId?: string;
}
