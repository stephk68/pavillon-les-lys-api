import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";

@Module({
  imports: [UserModule], // Pour accéder au UserService (requis par AuthenticationGuard)
  controllers: [FeedbackController],
  providers: [FeedbackService, PrismaService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
