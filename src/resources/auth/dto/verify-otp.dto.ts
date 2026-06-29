import { IsEmail, IsString, Length } from "class-validator";

export class VerifyOtpDto {
  @IsEmail({}, { message: "Email invalide" })
  email: string;

  @IsString()
  @Length(6, 6, { message: "Le code OTP doit contenir exactement 6 chiffres" })
  otp: string;
}
