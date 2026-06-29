import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { MailModule } from "../../mail/mail.module";
import { UserModule } from "../user/user.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [UserModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
