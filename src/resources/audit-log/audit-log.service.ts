import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";

export interface CreateAuditLogDto {
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
  folderNumber?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface FindAuditLogsOptions {
  userId?: string;
  action?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        action: dto.action,
        description: dto.description,
        entityType: dto.entityType,
        entityId: dto.entityId,
        folderNumber: dto.folderNumber,
        userId: dto.userId,
        metadata: dto.metadata as any,
      },
    });
  }

  async findAll(options: FindAuditLogsOptions = {}) {
    const { userId, action, skip = 0, take = 50 } = options;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}
