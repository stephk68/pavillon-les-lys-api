import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InventoryItemStatus, InventoryItemType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import {
  EQUIPMENT_HOLDING_STATUSES,
  intervalsOf,
  reservedOverlapping,
  upcomingPeakReserved,
} from "../../common/utils/schedule.util";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère tous les équipements avec filtres
   */
  async findAll(filters: {
    type?: InventoryItemType;
    status?: InventoryItemStatus;
    category?: string;
    search?: string;
    /** Disponibilité calculée pour les créneaux de ce dossier. */
    forFolderId?: string;
  }) {
    const where: Prisma.InventoryItemWhereInput = {};

    // Filtre par type (INTERNAL / EXTERNAL_PROVIDER)
    if (filters.type) {
      where.type = filters.type;
    }

    // Filtre par statut (AVAILABLE / MAINTENANCE / LOST)
    if (filters.status) {
      where.status = filters.status;
    }

    // Filtre par catégorie
    if (filters.category) {
      where.category = filters.category;
    }

    // Recherche textuelle (nom, description, providerName)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { providerName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        eventEquipments: {
          include: {
            eventFolder: {
              select: {
                id: true,
                schedules: {
                  select: {
                    date: true,
                    startTime: true,
                    endTime: true,
                  }
                },
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Créneaux du dossier ciblé (assignation de matériel depuis un dossier)
    const folderIntervals = filters.forFolderId
      ? intervalsOf(
          (
            await this.prisma.eventFolder.findUnique({
              where: { id: filters.forFolderId },
              select: { schedules: true },
            })
          )?.schedules ?? [],
        )
      : null;

    // Stock disponible calculé à partir des assignations (plus de compteur) :
    // - pour un dossier : total − réservations des autres dossiers actifs
    //   qui chevauchent ses créneaux ;
    // - sinon : total − pic de réservation à venir (stock garanti libre sur
    //   toute la période à venir). Les événements passés, annulés ou
    //   terminés ne comptent plus : le matériel se libère tout seul.
    return items.map((item) => {
      let availableStock = item.totalStock;

      if (item.type === InventoryItemType.INTERNAL) {
        const reservations = item.eventEquipments.map((re) => ({
          quantityReserved: re.quantityReserved,
          eventFolderId: re.eventFolderId,
          eventFolder: re.eventFolder,
        }));
        const reserved = folderIntervals
          ? reservedOverlapping(reservations, folderIntervals, filters.forFolderId)
          : upcomingPeakReserved(reservations);
        availableStock =
          item.status === InventoryItemStatus.AVAILABLE
            ? Math.max(0, item.totalStock - reserved)
            : 0;
      }

      return {
        ...item,
        availableStock,
      };
    });
  }

  /**
   * Récupère un équipement par ID
   */
  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        eventEquipments: {
          include: {
            eventFolder: {
              select: {
                id: true,
                schedules: {
                  select: {
                    date: true,
                    startTime: true,
                    endTime: true,
                  }
                },
                status: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Équipement avec l'ID ${id} introuvable`);
    }

    return item;
  }

  /**
   * Crée un nouvel équipement
   */
  async create(data: Prisma.InventoryItemCreateInput) {
    // Validation : Si type = EXTERNAL_PROVIDER, providerName est requis
    if (
      data.type === InventoryItemType.EXTERNAL_PROVIDER &&
      !data.providerName
    ) {
      throw new BadRequestException(
        "Le nom du prestataire est requis pour le matériel externe",
      );
    }

    // Validation : Si type = INTERNAL, totalStock doit être > 0
    if (
      data.type === InventoryItemType.INTERNAL &&
      (!data.totalStock || data.totalStock <= 0)
    ) {
      throw new BadRequestException(
        "Le stock total doit être supérieur à 0 pour le matériel interne",
      );
    }

    return this.prisma.inventoryItem.create({
      data: {
        ...data,
        availableStock: data.totalStock || 0,
      },
    });
  }

  /**
   * Met à jour un équipement
   */
  async update(id: string, data: Prisma.InventoryItemUpdateInput) {
    const item = await this.findOne(id);

    // Validation : Si on change le type vers EXTERNAL_PROVIDER, providerName requis
    if (
      data.type === InventoryItemType.EXTERNAL_PROVIDER &&
      !data.providerName &&
      !item.providerName
    ) {
      throw new BadRequestException(
        "Le nom du prestataire est requis pour le matériel externe",
      );
    }

    return this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprime un équipement (soft delete possible en changeant le status à LOST)
   */
  async delete(id: string) {
    const item = await this.findOne(id);

    // Vérifier si l'équipement est utilisé dans des dossiers actifs
    const activeFolders = item.eventEquipments.filter(
      (re) =>
        re.eventFolder.status === "BOOKED" ||
        re.eventFolder.status === "QUOTED" ||
        re.eventFolder.status === "READY",
    );

    if (activeFolders.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer : cet équipement est utilisé dans ${activeFolders.length} dossier(s) actif(s)`,
      );
    }

    return this.prisma.inventoryItem.delete({
      where: { id },
    });
  }

  /**
   * Vérifie la disponibilité d'un équipement pour une période donnée
   */
  async checkAvailability(id: string, start: Date, end: Date) {
    const item = await this.findOne(id);

    // Pour le matériel externe, toujours disponible (géré par le prestataire)
    if (item.type === InventoryItemType.EXTERNAL_PROVIDER) {
      return {
        available: true,
        message: "Matériel géré par prestataire externe",
        providerName: item.providerName,
      };
    }

    // Pour le matériel interne : dossiers actifs dont un créneau chevauche
    // la période demandée (mêmes statuts que l'assignation de matériel).
    const reservations = await this.prisma.eventEquipment.findMany({
      where: {
        inventoryItemId: id,
        eventFolder: { status: { in: EQUIPMENT_HOLDING_STATUSES } },
      },
      select: {
        quantityReserved: true,
        eventFolderId: true,
        eventFolder: {
          select: {
            status: true,
            schedules: { select: { date: true, startTime: true, endTime: true } },
          },
        },
      },
    });
    const period: [Date, Date][] = [[start, end]];
    const overlapping = reservations.filter(
      (r) => reservedOverlapping([r], period) > 0,
    );
    const reservedQuantity = overlapping.reduce(
      (sum, r) => sum + r.quantityReserved,
      0,
    );
    const availableQuantity =
      item.status === InventoryItemStatus.AVAILABLE
        ? item.totalStock - reservedQuantity
        : 0;

    return {
      available: availableQuantity > 0,
      totalStock: item.totalStock,
      reservedQuantity,
      availableQuantity,
      overlappingFolders: overlapping.map((r) => ({
        eventFolderId: r.eventFolderId,
        quantity: r.quantityReserved,
      })),
    };
  }

  /**
   * Statistiques d'inventaire
   */
  async getStats() {
    const totalItems = await this.prisma.inventoryItem.count();

    const itemsByType = await this.prisma.inventoryItem.groupBy({
      by: ["type"],
      _count: true,
    });

    const itemsByStatus = await this.prisma.inventoryItem.groupBy({
      by: ["status"],
      _count: true,
    });

    const itemsByCategory = await this.prisma.inventoryItem.groupBy({
      by: ["category"],
      _count: true,
    });

    return {
      totalItems,
      byType: itemsByType.reduce(
        (acc, item) => ({
          ...acc,
          [item.type]: item._count,
        }),
        {},
      ),
      byStatus: itemsByStatus.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: item._count,
        }),
        {},
      ),
      byCategory: itemsByCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
    };
  }
}
