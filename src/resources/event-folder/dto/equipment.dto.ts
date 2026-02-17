import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class AddEquipmentDto {
  @IsString()
  inventoryItemId: string;

  @IsInt()
  @Min(1)
  quantityReserved: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityReserved?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  returnedQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
