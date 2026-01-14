import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GlobalJwtModule } from "./common/jwt/global.module";
import { PrismaService } from "./common/services/prisma.service";
import { SeedService } from "./common/services/seed.service";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./resources/auth/auth.module";
import { ChekclistItemModule } from "./resources/chekclist-item/chekclist-item.module";
import { FeedbackModule } from "./resources/feedback/feedback.module";
import { InventoryModule } from "./resources/inventory/inventory.module";
import { PaymentModule } from "./resources/payment/payment.module";
import { QuoteModule } from "./resources/quote/quote.module";
import { ReservationModule } from "./resources/reservation/reservation.module";
import { UserModule } from "./resources/user/user.module";

@Module({
  imports: [
    UserModule,
    AuthModule,
    ReservationModule,
    PaymentModule,
    GlobalJwtModule,
    QuoteModule,
    ChekclistItemModule,
    FeedbackModule,
    HealthModule,
    MailModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService, PrismaService],
})
export class AppModule {}
