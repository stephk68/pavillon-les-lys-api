import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalJwtModule } from './common/jwt/global.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './resources/auth/auth.module';
import { ChekclistItemModule } from './resources/chekclist-item/chekclist-item.module';
import { FeedbackModule } from './resources/feedback/feedback.module';
import { PaymentModule } from './resources/payment/payment.module';
import { QuoteModule } from './resources/quote/quote.module';
import { ReservationModule } from './resources/reservation/reservation.module';
import { UserModule } from './resources/user/user.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
