import { PaymentType } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentDto {
  @IsString()
  eventFolderId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsOptional()
  @IsString()
  proofDocument?: string;

  @IsOptional()
  isRefundable?: boolean;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  proofDocument?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
