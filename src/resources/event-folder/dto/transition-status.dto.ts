import { EventStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class TransitionStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}
