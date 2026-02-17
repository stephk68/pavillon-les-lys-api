import {
    Injectable,
    NotFoundException
} from "@nestjs/common";
import { ChecklistItem } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import { CreateChekclistItemDto } from "./dto/create-chekclist-item.dto";
import { UpdateChekclistItemDto } from "./dto/update-chekclist-item.dto";

interface FindAllOptions {
  reservationId?: string;
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
    createChekclistItemDto: CreateChekclistItemDto
  ): Promise<ChecklistItem> {
    // Vérifier que la réservation existe
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: createChekclistItemDto.reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(
        `Réservation avec l'ID ${createChekclistItemDto.reservationId} non trouvée`
      );
    }

    // Obtenir le prochain ordre d'affichage
    const maxOrder = await this.prisma.checklistItem.aggregate({
      where: { reservationId: createChekclistItemDto.reservationId },
      _max: { displayOrder: true },
    });

    const nextOrder = (maxOrder._max.displayOrder || 0) + 1;

    return this.prisma.checklistItem.create({
      data: {
        title: createChekclistItemDto.title,
        description: createChekclistItemDto.description,
        reservationId: createChekclistItemDto.reservationId,
        assignedTo: createChekclistItemDto.assignedTo,
        dueAt: createChekclistItemDto.dueAt
          ? new Date(createChekclistItemDto.dueAt)
          : undefined,
        displayOrder: nextOrder,
      },
      include: {
        reservation: {
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
    const { reservationId, completed, assignedTo, skip = 0, take = 100 } = options;

    const where: any = {};

    if (reservationId) where.reservationId = reservationId;
    if (completed !== undefined) where.completed = completed;
    if (assignedTo) where.assignedTo = assignedTo;

    const [data, total] = await Promise.all([
      this.prisma.checklistItem.findMany({
        where,
        skip,
        take,
        include: {
          reservation: {
            select: {
              id: true,
              eventType: true,
              start: true,
            },
          },
        },
        orderBy: [{ reservationId: "asc" }, { displayOrder: "asc" }],
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
        reservation: {
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
        `Élément de checklist avec l'ID ${id} non trouvé`
      );
    }

    return item;
  }

  /**
   * Récupérer les éléments d'une réservation
   */
  async findByReservation(reservationId: string): Promise<ChecklistItem[]> {
    // Vérifier que la réservation existe
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(
        `Réservation avec l'ID ${reservationId} non trouvée`
      );
    }

    return this.prisma.checklistItem.findMany({
      where: { reservationId },
      orderBy: { displayOrder: "asc" },
    });
  }

  /**
   * Mettre à jour un élément
   */
  async update(
    id: string,
    updateChekclistItemDto: UpdateChekclistItemDto
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
        reservation: {
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
   * Réorganiser les éléments d'une réservation
   */
  async reorderItems(
    reservationId: string,
    itemIds: string[]
  ): Promise<ChecklistItem[]> {
    // Vérifier que la réservation existe
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(
        `Réservation avec l'ID ${reservationId} non trouvée`
      );
    }

    // Mettre à jour l'ordre de chaque élément
    const updates = itemIds.map((id, index) =>
      this.prisma.checklistItem.update({
        where: { id },
        data: { displayOrder: index + 1 },
      })
    );

    await Promise.all(updates);

    return this.findByReservation(reservationId);
  }

  /**
   * Obtenir les statistiques de checklist
   */
  async getStats(reservationId?: string): Promise<ChecklistStats> {
    const where: any = reservationId ? { reservationId } : {};

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
