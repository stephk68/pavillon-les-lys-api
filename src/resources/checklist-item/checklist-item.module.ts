import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { ChecklistItemController } from "./checklist-item.controller";
import { ChecklistItemService } from "./checklist-item.service";

@Module({
  imports: [UserModule], // Pour accéder au UserService (requis par AuthenticationGuard)
  controllers: [ChecklistItemController],
  providers: [ChecklistItemService, PrismaService],
  exports: [ChecklistItemService],
})
export class ChecklistItemModule {}
