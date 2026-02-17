import { PartialType } from "@nestjs/mapped-types";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateChekclistItemDto } from "./create-chekclist-item.dto";

export class UpdateChekclistItemDto extends PartialType(CreateChekclistItemDto) {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
