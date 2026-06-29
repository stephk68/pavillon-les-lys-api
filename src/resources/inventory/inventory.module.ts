import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [UserModule],
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService],
  exports: [InventoryService],
})
export class InventoryModule {}
