import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GlobalJwtModule } from "./common/jwt/global.module";
import { PrismaService } from "./common/services/prisma.service";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { AuditLogModule } from "./resources/audit-log/audit-log.module";
import { AuthModule } from "./resources/auth/auth.module";
import { ChecklistItemModule } from "./resources/checklist-item/checklist-item.module";
import { EventFolderModule } from "./resources/event-folder/event-folder.module";
import { FeedbackModule } from "./resources/feedback/feedback.module";
import { InventoryModule } from "./resources/inventory/inventory.module";
import { PaymentModule } from "./resources/payment/payment.module";
import { UserModule } from "./resources/user/user.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    UserModule,
    AuthModule,
    EventFolderModule,
    PaymentModule,
    GlobalJwtModule,
    ChecklistItemModule,
    FeedbackModule,
    HealthModule,
    MailModule,
    InventoryModule,
    SchedulerModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
