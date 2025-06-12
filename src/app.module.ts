import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalJwtModule } from './common/jwt/global.module';
import { AuthModule } from './resources/auth/auth.module';
import { PaymentModule } from './resources/payment/payment.module';
import { ReservationModule } from './resources/reservation/reservation.module';
import { UserModule } from './resources/user/user.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    ReservationModule,
    PaymentModule,
    GlobalJwtModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
