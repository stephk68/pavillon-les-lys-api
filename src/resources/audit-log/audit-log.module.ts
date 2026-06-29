import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UserModule } from "../user/user.module";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";

@Module({
  imports: [UserModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, PrismaService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
