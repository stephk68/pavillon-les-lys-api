import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { EventFolderController } from "./event-folder.controller";
import { EventFolderService } from "./event-folder.service";

@Module({
  imports: [UserModule],
  controllers: [EventFolderController],
  providers: [EventFolderService, PrismaService],
  exports: [EventFolderService],
})
export class EventFolderModule {}
