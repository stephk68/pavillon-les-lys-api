import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { QuoteDefaultItemController } from "./quote-default-item.controller";
import { QuoteDefaultItemService } from "./quote-default-item.service";

@Module({
  imports: [UserModule], // requis par AuthenticationGuard
  controllers: [QuoteDefaultItemController],
  providers: [QuoteDefaultItemService, PrismaService],
  exports: [QuoteDefaultItemService],
})
export class QuoteDefaultItemModule {}
