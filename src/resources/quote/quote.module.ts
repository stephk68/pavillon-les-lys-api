import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationModule } from '../reservation/reservation.module';
import { UserModule } from '../user/user.module';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [
    UserModule, // Pour accéder au UserService si nécessaire
    ReservationModule, // Pour lier les devis aux réservations
  ],
  controllers: [QuoteController],
  providers: [QuoteService, PrismaService],
  exports: [QuoteService], // Exporter le service pour l'utiliser dans d'autres modules
})
export class QuoteModule {}
