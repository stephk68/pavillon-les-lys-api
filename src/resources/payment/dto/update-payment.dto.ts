import { PartialType } from '@nestjs/mapped-types';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreatePaymentDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
