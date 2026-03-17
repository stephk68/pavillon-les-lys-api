import {
    Controller,
    Get,
    Query,
    UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { AuditLogService } from "./audit-log.service";

@Controller("audit-logs")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Roles(Role.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * GET /audit-logs
   * List all audit logs (ADMIN only)
   */
  @Get()
  async findAll(
    @Query("userId") userId?: string,
    @Query("action") action?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.auditLogService.findAll({
      userId,
      action,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
