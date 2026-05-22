import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { MailModule } from "../../mail/mail.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [MailModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
