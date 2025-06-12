import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationModule } from '../reservation/reservation.module';
import { UserModule } from '../user/user.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    UserModule, // Pour accéder au UserService
    ReservationModule, // Pour accéder au ReservationService
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService], // Exporter pour utilisation dans d'autres modules
})
export class PaymentModule {}
