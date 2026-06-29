import { IsEmail } from "class-validator";

export class CheckIdentityDto {
  @IsEmail({}, { message: "Email invalide" })
  email: string;
}
