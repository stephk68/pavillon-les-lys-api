import { Module } from "@nestjs/common";
import { UserModule } from "../resources/user/user.module";
import { MailController } from "./mail.controller";
import { MailModule } from "./mail.module";

/**
 * Expose les routes HTTP /mail/*. Séparé de MailModule pour éviter une
 * dépendance circulaire : UserModule importe MailModule, et les guards du
 * contrôleur ont besoin de UserService.
 */
@Module({
  imports: [MailModule, UserModule],
  controllers: [MailController],
})
export class MailApiModule {}
