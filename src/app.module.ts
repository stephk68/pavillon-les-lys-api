import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GlobalJwtModule } from "./common/jwt/global.module";
import { PrismaService } from "./common/services/prisma.service";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./resources/auth/auth.module";
import { ChekclistItemModule } from "./resources/chekclist-item/chekclist-item.module";
import { EventFolderModule } from "./resources/event-folder/event-folder.module";
import { FeedbackModule } from "./resources/feedback/feedback.module";
import { InventoryModule } from "./resources/inventory/inventory.module";
import { PaymentModule } from "./resources/payment/payment.module";
import { UserModule } from "./resources/user/user.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [
    UserModule,
    AuthModule,
    EventFolderModule,
    PaymentModule,
    GlobalJwtModule,
    ChekclistItemModule,
    FeedbackModule,
    HealthModule,
    MailModule,
    InventoryModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
