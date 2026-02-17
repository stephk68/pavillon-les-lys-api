import { Injectable, NotFoundException } from "@nestjs/common";
import { ChecklistItem } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import { CreateChekclistItemDto } from "./dto/create-chekclist-item.dto";
import { UpdateChekclistItemDto } from "./dto/update-chekclist-item.dto";

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
export class ChekclistItemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un nouvel élément de checklist
   */
  async create(
    createChekclistItemDto: CreateChekclistItemDto,
  ): Promise<ChecklistItem> {
    // Vérifier que le dossier événement existe
    const eventFolder = await this.prisma.eventFolder.findUnique({
      where: { id: createChekclistItemDto.eventFolderId },
    });

    if (!eventFolder) {
      throw new NotFoundException(
        `Dossier événement avec l'ID ${createChekclistItemDto.eventFolderId} non trouvé`,
      );
    }

    // Obtenir le prochain ordre d'affichage
    const maxOrder = await this.prisma.checklistItem.aggregate({
      where: { eventFolderId: createChekclistItemDto.eventFolderId },
      _max: { displayOrder: true },
    });

    const nextOrder = (maxOrder._max.displayOrder || 0) + 1;

    return this.prisma.checklistItem.create({
      data: {
        title: createChekclistItemDto.title,
        description: createChekclistItemDto.description,
        eventFolderId: createChekclistItemDto.eventFolderId,
        assignedTo: createChekclistItemDto.assignedTo,
        dueAt: createChekclistItemDto.dueAt
          ? new Date(createChekclistItemDto.dueAt)
          : undefined,
        displayOrder: nextOrder,
      },
      include: {
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            start: true,
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
              start: true,
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
            start: true,
            end: true,
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
    updateChekclistItemDto: UpdateChekclistItemDto,
  ): Promise<ChecklistItem> {
    await this.findOne(id); // Vérifier l'existence

    const data: any = {};

    if (updateChekclistItemDto.title !== undefined) {
      data.title = updateChekclistItemDto.title;
    }
    if (updateChekclistItemDto.description !== undefined) {
      data.description = updateChekclistItemDto.description;
    }
    if (updateChekclistItemDto.completed !== undefined) {
      data.completed = updateChekclistItemDto.completed;
      data.completedAt = updateChekclistItemDto.completed ? new Date() : null;
    }
    if (updateChekclistItemDto.assignedTo !== undefined) {
      data.assignedTo = updateChekclistItemDto.assignedTo;
    }
    if (updateChekclistItemDto.dueAt !== undefined) {
      data.dueAt = updateChekclistItemDto.dueAt
        ? new Date(updateChekclistItemDto.dueAt)
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
            start: true,
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

    // Mettre à jour l'ordre de chaque élément
    const updates = itemIds.map((id, index) =>
      this.prisma.checklistItem.update({
        where: { id },
        data: { displayOrder: index + 1 },
      }),
    );

    await Promise.all(updates);

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
