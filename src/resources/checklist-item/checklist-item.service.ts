import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ChecklistItem } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import { CreateChecklistItemDto } from "./dto/create-checklist-item.dto";
import { UpdateChecklistItemDto } from "./dto/update-checklist-item.dto";

interface FindAllOptions {
  eventFolderId?: string;
  completed?: boolean;
  assignedTo?: string;
  skip?: number;
  take?: number;
}

export interface ChecklistStats {
  totalItems: number;
  completedItems: number;
  completionRate: number;
  overdueItems: number;
  upcomingDeadlines: ChecklistItem[];
}

@Injectable()
export class ChecklistItemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un nouvel élément de checklist
   */
  async create(
    createChecklistItemDto: CreateChecklistItemDto,
  ): Promise<ChecklistItem> {
    // Vérifier que le dossier événement existe
    const eventFolder = await this.prisma.eventFolder.findUnique({
      where: { id: createChecklistItemDto.eventFolderId },
    });

    if (!eventFolder) {
      throw new NotFoundException(
        `Dossier événement avec l'ID ${createChecklistItemDto.eventFolderId} non trouvé`,
      );
    }

    // Obtenir le prochain ordre d'affichage
    const maxOrder = await this.prisma.checklistItem.aggregate({
      where: { eventFolderId: createChecklistItemDto.eventFolderId },
      _max: { displayOrder: true },
    });

    const nextOrder = (maxOrder._max.displayOrder || 0) + 1;

    return this.prisma.checklistItem.create({
      data: {
        title: createChecklistItemDto.title,
        description: createChecklistItemDto.description,
        eventFolderId: createChecklistItemDto.eventFolderId,
        assignedTo: createChecklistItemDto.assignedTo,
        dueAt: createChecklistItemDto.dueAt
          ? new Date(createChecklistItemDto.dueAt)
          : undefined,
        displayOrder: nextOrder,
      },
      include: {
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            schedules: { select: { date: true } },
          },
        },
      },
    });
  }

  /**
   * Récupérer tous les éléments avec filtres et pagination
   */
  async findAll(options: FindAllOptions = {}) {
    const {
      eventFolderId,
      completed,
      assignedTo,
      skip = 0,
      take = 100,
    } = options;

    const where: any = {};

    if (eventFolderId) where.eventFolderId = eventFolderId;
    if (completed !== undefined) where.completed = completed;
    if (assignedTo) where.assignedTo = assignedTo;

    const [data, total] = await Promise.all([
      this.prisma.checklistItem.findMany({
        where,
        skip,
        take,
        include: {
          eventFolder: {
            select: {
              id: true,
              eventType: true,
              schedules: { select: { date: true } },
            },
          },
        },
        orderBy: [{ eventFolderId: "asc" }, { displayOrder: "asc" }],
      }),
      this.prisma.checklistItem.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  /**
   * Récupérer un élément par ID
   */
  async findOne(id: string): Promise<ChecklistItem> {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id },
      include: {
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            schedules: { select: { date: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Élément de checklist avec l'ID ${id} non trouvé`,
      );
    }

    return item;
  }

  /**
   * Récupérer les éléments d'un dossier événement
   */
  async findByEventFolder(eventFolderId: string): Promise<ChecklistItem[]> {
    // Vérifier que le dossier existe
    const eventFolder = await this.prisma.eventFolder.findUnique({
      where: { id: eventFolderId },
    });

    if (!eventFolder) {
      throw new NotFoundException(
        `Dossier événement avec l'ID ${eventFolderId} non trouvé`,
      );
    }

    return this.prisma.checklistItem.findMany({
      where: { eventFolderId },
      orderBy: { displayOrder: "asc" },
    });
  }

  /**
   * Mettre à jour un élément
   */
  async update(
    id: string,
    updateChecklistItemDto: UpdateChecklistItemDto,
  ): Promise<ChecklistItem> {
    await this.findOne(id); // Vérifier l'existence

    const data: any = {};

    if (updateChecklistItemDto.title !== undefined) {
      data.title = updateChecklistItemDto.title;
    }
    if (updateChecklistItemDto.description !== undefined) {
      data.description = updateChecklistItemDto.description;
    }
    if (updateChecklistItemDto.completed !== undefined) {
      data.completed = updateChecklistItemDto.completed;
      data.completedAt = updateChecklistItemDto.completed ? new Date() : null;
    }
    if (updateChecklistItemDto.assignedTo !== undefined) {
      data.assignedTo = updateChecklistItemDto.assignedTo;
    }
    if (updateChecklistItemDto.dueAt !== undefined) {
      data.dueAt = updateChecklistItemDto.dueAt
        ? new Date(updateChecklistItemDto.dueAt)
        : null;
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data,
      include: {
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            schedules: { select: { date: true } },
          },
        },
      },
    });
  }

  /**
   * Supprimer un élément
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Vérifier l'existence
    await this.prisma.checklistItem.delete({ where: { id } });
  }

  /**
   * Marquer comme terminé
   */
  async markAsCompleted(id: string, notes?: string): Promise<ChecklistItem> {
    await this.findOne(id); // Vérifier l'existence

    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
        notes: notes || undefined,
      },
    });
  }

  /**
   * Marquer comme non terminé
   */
  async markAsIncomplete(id: string): Promise<ChecklistItem> {
    await this.findOne(id); // Vérifier l'existence

    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        completed: false,
        completedAt: null,
        notes: null,
      },
    });
  }

  /**
   * Réorganiser les éléments d'un dossier événement
   */
  async reorderItems(
    eventFolderId: string,
    itemIds: string[],
  ): Promise<ChecklistItem[]> {
    // Vérifier que le dossier existe
    const eventFolder = await this.prisma.eventFolder.findUnique({
      where: { id: eventFolderId },
    });

    if (!eventFolder) {
      throw new NotFoundException(
        `Dossier événement avec l'ID ${eventFolderId} non trouvé`,
      );
    }

    // Vérifier que tous les IDs appartiennent bien à ce dossier
    const items = await this.prisma.checklistItem.findMany({
      where: { id: { in: itemIds }, eventFolderId },
      select: { id: true },
    });
    if (items.length !== itemIds.length) {
      throw new BadRequestException(
        "Certains éléments n'appartiennent pas à ce dossier",
      );
    }

    // Mettre à jour l'ordre dans une transaction
    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.checklistItem.update({
          where: { id },
          data: { displayOrder: index + 1 },
        }),
      ),
    );

    return this.findByEventFolder(eventFolderId);
  }

  /**
   * Obtenir les statistiques de checklist
   */
  async getStats(eventFolderId?: string): Promise<ChecklistStats> {
    const where: any = eventFolderId ? { eventFolderId } : {};

    const [totalItems, completedItems, overdueItems, upcomingDeadlines] =
      await Promise.all([
        this.prisma.checklistItem.count({ where }),
        this.prisma.checklistItem.count({
          where: { ...where, completed: true },
        }),
        this.prisma.checklistItem.count({
          where: {
            ...where,
            completed: false,
            dueAt: { lt: new Date() },
          },
        }),
        this.prisma.checklistItem.findMany({
          where: {
            ...where,
            completed: false,
            dueAt: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
            },
          },
          orderBy: { dueAt: "asc" },
          take: 10,
        }),
      ]);

    return {
      totalItems,
      completedItems,
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      overdueItems,
      upcomingDeadlines,
    };
  }
}
