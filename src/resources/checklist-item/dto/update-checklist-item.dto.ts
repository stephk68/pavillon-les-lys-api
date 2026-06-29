import { PartialType } from "@nestjs/mapped-types";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateChecklistItemDto } from "./create-checklist-item.dto";

export class UpdateChecklistItemDto extends PartialType(
  CreateChecklistItemDto,
) {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
