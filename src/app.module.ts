import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalJwtModule } from './common/jwt/global.module';
import { AuthModule } from './resources/auth/auth.module';
import { PaymentModule } from './resources/payment/payment.module';
import { ReservationModule } from './resources/reservation/reservation.module';
import { UserModule } from './resources/user/user.module';
import { QuoteModule } from './resources/quote/quote.module';
import { ChekclistItemModule } from './resources/chekclist-item/chekclist-item.module';
import { FeedbackModule } from './resources/feedback/feedback.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
