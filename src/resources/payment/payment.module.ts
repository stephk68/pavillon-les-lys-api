import { Module } from "@nestjs/common";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [UserModule],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService, PdfService],
  exports: [PaymentService],
})
export class PaymentModule {}
