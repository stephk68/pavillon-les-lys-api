import { IsNumber, IsString, Min } from 'class-validator';

export class QuoteItemDto {
  @IsString()
  name: string;

  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}
