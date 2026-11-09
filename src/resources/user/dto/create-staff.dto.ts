import { Role } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /**
   * Confirmation explicite de l'admin : l'email appartient déjà à un CLIENT,
   * qui sera promu au rôle demandé (son compte et ses dossiers sont conservés).
   */
  @IsOptional()
  @IsBoolean()
  confirmPromotion?: boolean;
}
