import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { ChekclistItemController } from "./chekclist-item.controller";
import { ChekclistItemService } from "./chekclist-item.service";

@Module({
  imports: [UserModule], // Pour accéder au UserService (requis par AuthenticationGuard)
  controllers: [ChekclistItemController],
  providers: [ChekclistItemService, PrismaService],
  exports: [ChekclistItemService],
})
export class ChekclistItemModule {}
