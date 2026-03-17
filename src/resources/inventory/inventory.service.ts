import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InventoryItemStatus, InventoryItemType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";

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

    // Calcul du stock disponible pour chaque item
    return items.map((item) => {
      let availableStock = item.totalStock;

      // Pour le matériel interne, calculer le stock disponible
      if (item.type === InventoryItemType.INTERNAL) {
        const reservedQuantity = item.eventEquipments
          .filter(
            (re) =>
              re.eventFolder.status !== "CANCELLED" &&
              re.eventFolder.status !== "COMPLETED",
          )
          .reduce((sum, re) => sum + re.quantityReserved, 0);

        availableStock = item.totalStock - reservedQuantity;
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

    // Pour le matériel interne, calculer les dossiers qui se chevauchent
    const overlappingEquipments = await this.prisma.eventEquipment.findMany({
      where: {
        inventoryItemId: id,
        eventFolder: {
          status: {
            in: ["QUOTED", "BOOKED", "READY"],
          },
          schedules: {
            some: {
              date: { gte: start, lte: end }
            }
          }
        },
      },
      include: {
        eventFolder: true,
      },
    });

    const reservedQuantity = overlappingEquipments.reduce(
      (sum, re) => sum + re.quantityReserved,
      0,
    );

    const availableQuantity = item.totalStock - reservedQuantity;

    return {
      available: availableQuantity > 0,
      totalStock: item.totalStock,
      reservedQuantity,
      availableQuantity,
      overlappingFolders: overlappingEquipments.map((re) => ({
        eventFolderId: re.eventFolder.id,
        quantity: re.quantityReserved,
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
