import { Module } from "@nestjs/common";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { MailModule } from "../../mail/mail.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { UserModule } from "../user/user.module";
import { EventFolderController } from "./event-folder.controller";
import { EventFolderService } from "./event-folder.service";

@Module({
  imports: [UserModule, AuditLogModule, MailModule],
  controllers: [EventFolderController],
  providers: [EventFolderService, PrismaService, PdfService],
  exports: [EventFolderService],
})
export class EventFolderModule {}
