import { forwardRef, Module } from "@nestjs/common";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { MailModule } from "../../mail/mail.module";
import { ReservationModule } from "../reservation/reservation.module";
import { UserModule } from "../user/user.module";
import { QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";

@Module({
  imports: [
    UserModule, // Pour accéder au UserService si nécessaire
    forwardRef(() => ReservationModule), // ForwardRef pour éviter la dépendance circulaire
    MailModule, // Pour l'envoi d'emails avec PDF
  ],
  controllers: [QuoteController],
  providers: [QuoteService, PrismaService, PdfService],
  exports: [QuoteService], // Exporter le service pour l'utiliser dans d'autres modules
})
export class QuoteModule {}

