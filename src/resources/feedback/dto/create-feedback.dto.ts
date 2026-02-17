import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateFeedbackDto {
  @IsOptional()
  @IsUUID()
  eventFolderId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
