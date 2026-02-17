import { PaymentType } from '@prisma/client';
import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsUUID()
  reservationId: string;

  @IsOptional()
  @IsUUID()
  quoteId?: string; // Lien vers le devis

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string; // Pour les gateways de paiement

  @IsOptional()
  @IsString()
  proofDocument?: string; // URL du justificatif de paiement

  @IsOptional()
  @IsBoolean()
  isRefundable?: boolean; // Pour les cautions
}
