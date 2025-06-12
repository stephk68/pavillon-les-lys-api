import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { UserModule } from '../user/user.module';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';

@Module({
  imports: [UserModule], // Pour accéder au UserService si nécessaire
  controllers: [ReservationController],
  providers: [ReservationService, PrismaService],
  exports: [ReservationService], // Exporter le service pour l'utiliser dans d'autres modules
})
export class ReservationModule {}
