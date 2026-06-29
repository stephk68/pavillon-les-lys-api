import { InventoryItemStatus, InventoryItemType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsEnum(InventoryItemType)
  type: InventoryItemType;

  @IsOptional()
  @IsString()
  category?: string;

  // Champ obligatoire si type = EXTERNAL_PROVIDER
  @ValidateIf((o) => o.type === InventoryItemType.EXTERNAL_PROVIDER)
  @IsString()
  @IsNotEmpty({ message: "providerName is required for EXTERNAL_PROVIDER" })
  providerName?: string;

  @IsOptional()
  @IsString()
  providerContact?: string;

  // Champ obligatoire si type = INTERNAL
  @ValidateIf((o) => o.type === InventoryItemType.INTERNAL)
  @IsInt()
  @Min(0, { message: "totalStock must be >= 0 for INTERNAL items" })
  totalStock?: number;

  @IsOptional()
  @IsEnum(InventoryItemStatus)
  status?: InventoryItemStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
