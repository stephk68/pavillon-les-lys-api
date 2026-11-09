import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GlobalJwtModule } from "./common/jwt/global.module";
import { PrismaService } from "./common/services/prisma.service";
import { HealthModule } from "./health/health.module";
import { MailApiModule } from "./mail/mail-api.module";
import { MailModule } from "./mail/mail.module";
import { AuditLogModule } from "./resources/audit-log/audit-log.module";
import { AuthModule } from "./resources/auth/auth.module";
import { ChecklistItemModule } from "./resources/checklist-item/checklist-item.module";
import { EventFolderModule } from "./resources/event-folder/event-folder.module";
import { FeedbackModule } from "./resources/feedback/feedback.module";
import { InventoryModule } from "./resources/inventory/inventory.module";
import { PaymentModule } from "./resources/payment/payment.module";
import { QuoteDefaultItemModule } from "./resources/quote-default-item/quote-default-item.module";
import { UserModule } from "./resources/user/user.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [
    // Charge le .env (en local) — en Docker les variables sont déjà injectées.
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite globale généreuse (le backoffice enchaîne beaucoup de requêtes) ;
    // les routes sensibles (auth, formulaires publics) ont un @Throttle plus strict.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 300,
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
    MailApiModule,
    InventoryModule,
    SchedulerModule,
    AuditLogModule,
    QuoteDefaultItemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // Sans ce guard global, les décorateurs @Throttle n'avaient aucun effet.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
