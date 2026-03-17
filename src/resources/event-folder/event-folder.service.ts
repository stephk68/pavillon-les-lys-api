import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  EventStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../common/services/prisma.service";
import { MailService } from "../../mail/mail.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { CreateEventFolderDto } from "./dto/create-event-folder.dto";
import { CreateReservationRequestDto } from "./dto/create-reservation-request.dto";
import { AddEquipmentDto, UpdateEquipmentDto } from "./dto/equipment.dto";
import { UpdateEventFolderDto } from "./dto/update-event-folder.dto";

// Default checklist items generated for every new event folder
const DEFAULT_CHECKLIST_ITEMS = [
  {
    title: "Nettoyage de la salle",
    description: "Nettoyage complet de la salle avant l'événement",
    displayOrder: 1,
  },
  {
    title: "Rafraîchissement 1h avant",
    description: "Mise en température et aération de la salle",
    displayOrder: 2,
  },
  {
    title: "Mise en place tables/chaises",
    description: "Installation du mobilier selon le plan prévu",
    displayOrder: 3,
  },
  {
    title: "Vérification matériel",
    description: "Contrôle de tout l'équipement et matériel attribué",
    displayOrder: 4,
  },
  {
    title: "Rangement post-événement",
    description: "Nettoyage et remise en état après l'événement",
    displayOrder: 5,
  },
];

// Valid status transitions
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  PROSPECT: [EventStatus.QUOTED, EventStatus.CANCELLED],
  QUOTED: [EventStatus.BOOKED, EventStatus.CANCELLED],
  BOOKED: [EventStatus.READY, EventStatus.CANCELLED],
  READY: [EventStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class EventFolderService {
  private readonly logger = new Logger(EventFolderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly mailService: MailService,
  ) {}

  // ==================== HELPERS ====================

  private async generateNumber(
    tx?: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
  ): Promise<string> {
    const db = tx || this.prisma;
    const now = new Date();
    const year = now.getFullYear();

    const folders = await db.eventFolder.findMany({
      where: {
        folderNumber: { startsWith: `EVT-${year}-` },
      },
      select: { folderNumber: true },
    });

    let maxSeq = 0;
    for (const f of folders) {
      const seq = parseInt(f.folderNumber.split("-")[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }

    return `EVT-${year}-${String(maxSeq + 1).padStart(4, "0")}`;
  }

  private calculateTotals(items: { quantity: number; unitPrice: number }[]) {
    const totalHT = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const vatRate = 0; // TVA désactivée
    const totalTTC = totalHT + totalHT * (vatRate / 100);
    return {
      totalHT: new Prisma.Decimal(totalHT),
      vatRate: new Prisma.Decimal(vatRate),
      totalTTC: new Prisma.Decimal(totalTTC),
    };
  }

  private fullInclude() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
        },
      },
      schedules: { orderBy: { date: "asc" as const } },
      items: { orderBy: { createdAt: "asc" as const } },
      payments: { orderBy: { createdAt: "asc" as const } },
      checklist: { orderBy: { displayOrder: "asc" as const } },
      feedbacks: true,
      equipments: {
        include: {
          inventoryItem: true,
        },
      },
    };
  }

  // ==================== ATOMIC CREATION ====================

  async create(dto: CreateEventFolderDto, createdBy?: string) {
    if (!dto.schedules || dto.schedules.length === 0) {
      throw new BadRequestException(
        "Au moins un horaire (schedule) est requis",
      );
    }

    // Check validity of schedules
    for (const s of dto.schedules) {
      if (s.endTime <= s.startTime) {
        throw new BadRequestException(
          "L'heure de fin doit être postérieure à l'heure de début pour chaque jour",
        );
      }
    }

    // Check availability
    const isAvailable = await this.checkAvailability(dto.schedules);
    if (!isAvailable) {
      throw new ConflictException(
        "La salle n'est pas disponible pour les dates sélectionnées",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Resolve or create user
      let userId = dto.userId;
      let isNewClient = false;

      if (!userId && dto.clientEmail) {
        // Try to find existing user
        const existing = await tx.user.findUnique({
          where: { email: dto.clientEmail },
        });

        if (existing) {
          userId = existing.id;
        } else {
          // Auto-create client
          const tempPassword = require("crypto")
            .randomBytes(12)
            .toString("base64url")
            .slice(0, 16);
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          const newUser = await tx.user.create({
            data: {
              email: dto.clientEmail,
              password: hashedPassword,
              firstName: dto.clientFirstName || "Client",
              lastName: dto.clientLastName || "Nouveau",
              phone: dto.clientPhone,
              role: "CLIENT",
              isFirstLogin: true,
              createdBy,
            },
          });
          userId = newUser.id;
          isNewClient = true;
        }
      }

      if (!userId) {
        throw new BadRequestException(
          "userId ou clientEmail est requis pour créer un dossier",
        );
      }

      // 2) Calculate totals from items
      const items = dto.items || [];
      const totals = this.calculateTotals(
        items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      );

      // 3) Create the event folder
      const folderNumber = await this.generateNumber(tx);
      const eventFolder = await tx.eventFolder.create({
        data: {
          folderNumber,
          userId,
          eventType: dto.eventType,
          schedules: {
            create: dto.schedules.map((s) => ({
              date: new Date(s.date),
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          },
          attendees: dto.attendees,
          description: dto.description,
          specialRequests: dto.specialRequests,
          status: EventStatus.PROSPECT,

          basePrice: dto.basePrice || 0,
          depositAmount: dto.depositAmount || 0,
          cautionAmount: dto.cautionAmount || 0,
          remainingBalance: dto.remainingBalance || 0,

          totalHT: totals.totalHT,
          vatRate: totals.vatRate,
          totalTTC: totals.totalTTC,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          createdBy,
          // Create items
          items:
            items.length > 0
              ? {
                  create: items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: new Prisma.Decimal(item.unitPrice),
                    totalPrice: new Prisma.Decimal(
                      item.quantity * item.unitPrice,
                    ),
                  })),
                }
              : undefined,
          // Auto-generate default checklist
          checklist: {
            create: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
              ...item,
              createdBy,
            })),
          },
        },
        include: this.fullInclude(),
      });

      const client = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
        },
      });

      return { eventFolder, client, isNewClient };
    });

    // Audit log for folder creation (fire-and-forget)
    this.auditLogService
      .create({
        action: "FOLDER_CREATED",
        description: `Nouveau dossier ${result.eventFolder.folderNumber} créé`,
        entityType: "EventFolder",
        entityId: result.eventFolder.id,
        folderNumber: result.eventFolder.folderNumber,
        userId: createdBy || result.eventFolder.userId,
      })
      .catch(() => {});

    return result;
  }

  // ==================== PUBLIC RESERVATION REQUEST ====================

  async createPublicRequest(dto: CreateReservationRequestDto) {
    // Map to existing create flow
    const createDto: CreateEventFolderDto = {
      clientEmail: dto.email,
      clientFirstName: dto.firstName,
      clientLastName: dto.lastName,
      clientPhone: dto.phone,
      eventType: dto.eventType,
      schedules: [
        {
          date: dto.date,
          startTime: "10:00",
          endTime: "23:00",
        },
      ],
      attendees: dto.guestCount,
      description: dto.description,
    };

    const result = await this.create(createDto);

    // Send welcome email if new client
    if (result.isNewClient && result.client) {
      this.mailService.sendWelcomeEmail(result.client).catch((err) => {
        this.logger.warn(`Failed to send welcome email: ${err.message}`);
      });
    }

    return {
      message: "Votre demande de réservation a été enregistrée avec succès",
      folderNumber: result.eventFolder.folderNumber,
      isNewClient: result.isNewClient,
    };
  }

  // ==================== READ ====================

  async findAll(options?: {
    status?: EventStatus;
    eventType?: string;
    userId?: string;
    search?: string;
    skip?: number;
    take?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Prisma.EventFolderWhereInput = {};

    if (options?.status) where.status = options.status;
    if (options?.eventType) where.eventType = options.eventType as any;
    if (options?.userId) where.userId = options.userId;
    if (options?.search) {
      where.OR = [
        { folderNumber: { contains: options.search, mode: "insensitive" } },
        {
          user: {
            firstName: { contains: options.search, mode: "insensitive" },
          },
        },
        {
          user: { lastName: { contains: options.search, mode: "insensitive" } },
        },
        { user: { email: { contains: options.search, mode: "insensitive" } } },
        { description: { contains: options.search, mode: "insensitive" } },
      ];
    }
    if (options?.startDate || options?.endDate) {
      const datesWhere: any = {};
      if (options.startDate) datesWhere.gte = options.startDate;
      if (options.endDate) datesWhere.lte = options.endDate;
      where.schedules = {
        some: {
          date: datesWhere,
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.eventFolder.findMany({
        where,
        include: this.fullInclude(),
        orderBy: { createdAt: "desc" },
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.eventFolder.count({ where }),
    ]);

    return { data, total, skip: options?.skip || 0, take: options?.take || 50 };
  }

  async findOne(id: string) {
    const folder = await this.prisma.eventFolder.findUnique({
      where: { id },
      include: this.fullInclude(),
    });

    if (!folder) {
      throw new NotFoundException(`Dossier ${id} introuvable`);
    }
    return folder;
  }

  // ==================== UPDATE ====================

  async update(id: string, dto: UpdateEventFolderDto, updatedBy?: string) {
    const folder = await this.findOne(id);

    // If dates changed, re-check availability
    if (dto.schedules) {
      if (dto.schedules.length === 0) {
        throw new BadRequestException(
          "Un dossier doit avoir au moins un horaire.",
        );
      }
      for (const s of dto.schedules) {
        if (s.endTime <= s.startTime) {
          throw new BadRequestException(
            "L'heure de fin doit être postérieure à l'heure de début pour chaque jour",
          );
        }
      }

      const isAvailable = await this.checkAvailability(dto.schedules, id);
      if (!isAvailable) {
        throw new ConflictException(
          "La salle n'est pas disponible pour les dates sélectionnées",
        );
      }
    }

    // Build update data
    const updateData: Prisma.EventFolderUpdateInput = {
      ...(dto.eventType && { eventType: dto.eventType }),
      ...(dto.attendees && { attendees: dto.attendees }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.specialRequests !== undefined && {
        specialRequests: dto.specialRequests,
      }),
      ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
      ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
      ...(dto.depositAmount !== undefined && {
        depositAmount: dto.depositAmount,
      }),
      ...(dto.cautionAmount !== undefined && {
        cautionAmount: dto.cautionAmount,
      }),
      ...(dto.remainingBalance !== undefined && {
        remainingBalance: dto.remainingBalance,
      }),
      version: { increment: 1 },
      updatedBy,
    };

    // If items or schedules provided, handle in transaction
    if (dto.items || dto.schedules) {
      const totals = dto.items
        ? this.calculateTotals(
            dto.items.map((i) => ({
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          )
        : undefined;

      if (totals) {
        updateData.totalHT = totals.totalHT;
        updateData.vatRate = totals.vatRate;
        updateData.totalTTC = totals.totalTTC;
      }

      return this.prisma.$transaction(async (tx) => {
        // Recreate items if provided
        if (dto.items) {
          await tx.eventFolderItem.deleteMany({
            where: { eventFolderId: id },
          });
        }
        // Recreate schedules if provided
        if (dto.schedules) {
          await tx.eventSchedule.deleteMany({ where: { eventFolderId: id } });
        }

        return tx.eventFolder.update({
          where: { id },
          data: {
            ...updateData,
            ...(dto.items && {
              items: {
                create: dto.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: new Prisma.Decimal(item.unitPrice),
                  totalPrice: new Prisma.Decimal(
                    item.quantity * item.unitPrice,
                  ),
                })),
              },
            }),
            ...(dto.schedules && {
              schedules: {
                create: dto.schedules.map((s) => ({
                  date: new Date(s.date),
                  startTime: s.startTime,
                  endTime: s.endTime,
                })),
              },
            }),
          },
          include: this.fullInclude(),
        });
      });
    }

    return this.prisma.eventFolder.update({
      where: { id },
      data: updateData,
      include: this.fullInclude(),
    });
  }

  // ==================== DELETE ====================

  async remove(id: string) {
    const folder = await this.findOne(id);

    if (
      folder.status !== EventStatus.PROSPECT &&
      folder.status !== EventStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Seuls les dossiers en statut PROSPECT ou CANCELLED peuvent être supprimés",
      );
    }

    // Check no PAID payments
    const paidPayments = await this.prisma.payment.count({
      where: { eventFolderId: id, status: PaymentStatus.PAID },
    });

    if (paidPayments > 0) {
      throw new BadRequestException(
        "Impossible de supprimer un dossier avec des paiements validés",
      );
    }

    await this.prisma.eventFolder.delete({ where: { id } });
  }

  // ==================== STATUS MACHINE ====================

  async transitionStatus(
    id: string,
    targetStatus: EventStatus,
    updatedBy?: string,
  ) {
    const folder = await this.findOne(id);
    const currentStatus = folder.status as EventStatus;

    // Validate transition
    const allowedTargets = VALID_TRANSITIONS[currentStatus];
    if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
      throw new BadRequestException(
        `Transition ${currentStatus} → ${targetStatus} non autorisée. ` +
          `Transitions possibles : ${allowedTargets?.join(", ") || "aucune"}`,
      );
    }

    // Validate pre-conditions per target status
    switch (targetStatus) {
      case EventStatus.QUOTED: {
        // Must have at least 1 item and totalTTC > 0
        if (!folder.items || folder.items.length === 0) {
          throw new BadRequestException(
            "Le dossier doit contenir au moins un item pour passer en QUOTED",
          );
        }
        if (Number(folder.totalTTC) <= 0) {
          throw new BadRequestException(
            "Le total TTC doit être supérieur à 0 pour passer en QUOTED",
          );
        }
        break;
      }

      case EventStatus.BOOKED: {
        // Must have ACOMPTE payment >= 50% of totalTTC that is PAID
        const acomptePaid = await this.prisma.payment.aggregate({
          where: {
            eventFolderId: id,
            type: PaymentType.ACOMPTE,
            status: PaymentStatus.PAID,
          },
          _sum: { amount: true },
        });
        const acompteAmount = Number(acomptePaid._sum.amount || 0);
        const requiredAcompte = Number(folder.totalTTC) * 0.5;

        if (acompteAmount < requiredAcompte) {
          throw new BadRequestException(
            `Acompte insuffisant. Requis : ${requiredAcompte.toFixed(0)} XOF (50%), ` +
              `Payé : ${acompteAmount.toFixed(0)} XOF`,
          );
        }
        break;
      }

      case EventStatus.READY: {
        // Must have SOLDE + CAUTION paid, and at least 1 equipment assigned
        const payments = await this.prisma.payment.findMany({
          where: { eventFolderId: id, status: PaymentStatus.PAID },
        });

        const soldePaid = payments
          .filter((p) => p.type === PaymentType.SOLDE)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const cautionPaid = payments
          .filter((p) => p.type === PaymentType.CAUTION)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        if (soldePaid <= 0) {
          throw new BadRequestException(
            "Le solde doit être payé pour passer en READY",
          );
        }
        if (cautionPaid <= 0) {
          throw new BadRequestException(
            "La caution doit être payée pour passer en READY",
          );
        }

        // Auto-complete any remaining checklist items
        await this.prisma.checklistItem.updateMany({
          where: { eventFolderId: id, completed: false },
          data: { completed: true, completedAt: new Date() },
        });
        break;
      }

      case EventStatus.COMPLETED: {
        if (!folder.schedules || folder.schedules.length === 0) {
          throw new BadRequestException(
            "Aucun horaire défini pour cet événement",
          );
        }
        const lastSchedule = folder.schedules.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];

        if (new Date(lastSchedule.date) > new Date()) {
          throw new BadRequestException(
            "L'événement n'est pas encore terminé (date de fin dans le futur)",
          );
        }

        // All checklist items must be completed
        const incompleteChecklist = await this.prisma.checklistItem.count({
          where: { eventFolderId: id, completed: false },
        });
        if (incompleteChecklist > 0) {
          throw new BadRequestException(
            `${incompleteChecklist} tâche(s) de la checklist ne sont pas complétées`,
          );
        }
        break;
      }

      case EventStatus.CANCELLED: {
        // Allowed from PROSPECT, QUOTED, BOOKED (already validated by VALID_TRANSITIONS)
        break;
      }
    }

    // Perform the transition
    const updated = await this.prisma.eventFolder.update({
      where: { id },
      data: {
        status: targetStatus,
        ...(targetStatus === EventStatus.QUOTED && !folder.contractSentAt
          ? { contractSentAt: new Date() }
          : {}),
        updatedBy,
      },
      include: this.fullInclude(),
    });

    this.logger.log(
      `Dossier ${folder.folderNumber}: ${currentStatus} → ${targetStatus}`,
    );

    // Audit log for status transition (fire-and-forget)
    this.auditLogService
      .create({
        action: "STATUS_CHANGE",
        description: `Dossier ${folder.folderNumber} : ${currentStatus} → ${targetStatus}`,
        entityType: "EventFolder",
        entityId: id,
        folderNumber: folder.folderNumber,
        userId: updatedBy || folder.userId,
      })
      .catch(() => {});

    // Envoi d'emails selon la transition (fire-and-forget)
    const user = updated.user || folder.user;
    if (user) {
      switch (targetStatus) {
        case EventStatus.QUOTED:
          this.mailService
            .sendContract(
              {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
              updated,
            )
            .catch(() => {});
          break;
        case EventStatus.BOOKED:
          this.mailService
            .sendBookingConfirmation(
              {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
              updated,
            )
            .catch(() => {});
          break;
        case EventStatus.COMPLETED:
          this.mailService
            .sendFeedbackRequest(
              {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
              updated,
            )
            .catch(() => {});
          break;
      }
    }

    return updated;
  }

  // ==================== FINANCIAL ====================

  async getFinancialSummary(id: string) {
    const folder = await this.findOne(id);

    const payments = await this.prisma.payment.findMany({
      where: { eventFolderId: id },
    });

    const totalTTC = Number(folder.totalTTC);
    const acompteRequired = totalTTC * 0.5;

    const acomptePaid = payments
      .filter(
        (p) =>
          p.type === PaymentType.ACOMPTE && p.status === PaymentStatus.PAID,
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const soldePaid = payments
      .filter(
        (p) => p.type === PaymentType.SOLDE && p.status === PaymentStatus.PAID,
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const cautionPaid = payments
      .filter(
        (p) =>
          p.type === PaymentType.CAUTION && p.status === PaymentStatus.PAID,
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPaid = acomptePaid + soldePaid;
    const soldeRemaining = totalTTC - totalPaid;

    return {
      totalHT: Number(folder.totalHT),
      totalTTC,
      acompteRequired,
      acomptePaid,
      soldePaid,
      soldeRemaining: Math.max(0, soldeRemaining),
      cautionPaid,
      totalPaid,
      isFullyPaid: soldeRemaining <= 0,
      payments: payments.map((p) => ({
        id: p.id,
        type: p.type,
        status: p.status,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        paidAt: p.paidAt,
      })),
    };
  }

  async generateDefaultPayments(id: string, createdBy?: string) {
    const folder = await this.findOne(id);
    const totalTTC = Number(folder.totalTTC);

    if (totalTTC <= 0) {
      throw new BadRequestException(
        "Le total TTC doit être supérieur à 0 pour générer les paiements",
      );
    }

    // Check if payments already exist
    const existingPayments = await this.prisma.payment.count({
      where: { eventFolderId: id },
    });
    if (existingPayments > 0) {
      throw new BadRequestException(
        "Des paiements existent déjà pour ce dossier",
      );
    }

    const acompte = totalTTC * 0.5;
    const solde = totalTTC - acompte;
    const caution = Number(process.env.CAUTION_AMOUNT || 100000); // Default 100,000 XOF

    if (!folder.schedules || folder.schedules.length === 0) {
      throw new BadRequestException("Le dossier n'a pas d'horaires définis.");
    }
    const startDate = new Date(folder.schedules[0].date);
    const j21 = new Date(startDate.getTime() - 21 * 24 * 60 * 60 * 1000);
    const j14 = new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    const payments = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          eventFolderId: id,
          userId: folder.userId,
          amount: new Prisma.Decimal(acompte),
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.PENDING,
          dueDate: j21,
          createdBy,
        },
      }),
      this.prisma.payment.create({
        data: {
          eventFolderId: id,
          userId: folder.userId,
          amount: new Prisma.Decimal(solde),
          type: PaymentType.SOLDE,
          status: PaymentStatus.PENDING,
          dueDate: j14,
          createdBy,
        },
      }),
      this.prisma.payment.create({
        data: {
          eventFolderId: id,
          userId: folder.userId,
          amount: new Prisma.Decimal(caution),
          type: PaymentType.CAUTION,
          status: PaymentStatus.PENDING,
          isRefundable: true,
          dueDate: j14,
          createdBy,
        },
      }),
    ]);

    return payments;
  }

  // ==================== AVAILABILITY & CALENDAR ====================

  async checkAvailability(
    schedules: { date: string | Date; startTime: string; endTime: string }[],
    excludeId?: string,
  ): Promise<boolean> {
    const conflicts = await this.prisma.eventSchedule.count({
      where: {
        eventFolder: {
          status: {
            in: [EventStatus.BOOKED, EventStatus.READY, EventStatus.QUOTED],
          },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        OR: schedules.map((s) => ({
          date: new Date(s.date),
          startTime: { lt: s.endTime },
          endTime: { gt: s.startTime },
        })),
      },
    });
    return conflicts === 0;
  }

  async getCalendar(month?: number, year?: number) {
    const where: Prisma.EventFolderWhereInput = {
      status: {
        in: [EventStatus.BOOKED, EventStatus.READY, EventStatus.COMPLETED],
      },
    };

    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      where.schedules = {
        some: {
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      };
    }

    const events = await this.prisma.eventFolder.findMany({
      where,
      select: {
        id: true,
        folderNumber: true,
        schedules: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        eventType: true,
        status: true,
        attendees: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return events;
  }

  /**
   * Returns an array of booked date strings (YYYY-MM-DD) for a given month.
   * Public endpoint — no sensitive data exposed.
   */
  async getBookedDates(month?: number, year?: number): Promise<string[]> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const schedules = await this.prisma.eventSchedule.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        eventFolder: {
          status: {
            in: [EventStatus.BOOKED, EventStatus.READY],
          },
        },
      },
      select: { date: true },
    });

    const dates = schedules.map((s) => s.date.toISOString().split("T")[0]);
    return [...new Set(dates)];
  }

  // ==================== EQUIPMENT MANAGEMENT ====================

  async addEquipment(eventFolderId: string, dto: AddEquipmentDto) {
    // Verify event folder exists
    await this.findOne(eventFolderId);

    // Verify inventory item exists and has stock
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });
    if (!item) {
      throw new NotFoundException("Équipement introuvable dans l'inventaire");
    }
    if (
      item.type === "INTERNAL" &&
      item.availableStock < dto.quantityReserved
    ) {
      throw new BadRequestException(
        `Stock insuffisant. Disponible : ${item.availableStock}, Demandé : ${dto.quantityReserved}`,
      );
    }

    // Check if already assigned
    const existing = await this.prisma.eventEquipment.findUnique({
      where: {
        eventFolderId_inventoryItemId: {
          eventFolderId,
          inventoryItemId: dto.inventoryItemId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        "Cet équipement est déjà assigné à ce dossier",
      );
    }

    const [equipment] = await this.prisma.$transaction([
      this.prisma.eventEquipment.create({
        data: {
          eventFolderId,
          inventoryItemId: dto.inventoryItemId,
          quantityReserved: dto.quantityReserved,
          notes: dto.notes,
        },
        include: { inventoryItem: true },
      }),
      // Update available stock
      ...(item.type === "INTERNAL"
        ? [
            this.prisma.inventoryItem.update({
              where: { id: dto.inventoryItemId },
              data: {
                availableStock: { decrement: dto.quantityReserved },
              },
            }),
          ]
        : []),
    ]);

    return equipment;
  }

  async updateEquipment(
    eventFolderId: string,
    equipmentId: string,
    dto: UpdateEquipmentDto,
  ) {
    const equipment = await this.prisma.eventEquipment.findFirst({
      where: { id: equipmentId, eventFolderId },
      include: { inventoryItem: true },
    });

    if (!equipment) {
      throw new NotFoundException("Assignation d'équipement introuvable");
    }

    // If quantity changed, update stock
    if (
      dto.quantityReserved !== undefined &&
      dto.quantityReserved !== equipment.quantityReserved &&
      equipment.inventoryItem.type === "INTERNAL"
    ) {
      const diff = dto.quantityReserved - equipment.quantityReserved;
      if (diff > 0 && equipment.inventoryItem.availableStock < diff) {
        throw new BadRequestException(
          `Stock insuffisant. Disponible : ${equipment.inventoryItem.availableStock}`,
        );
      }

      await this.prisma.inventoryItem.update({
        where: { id: equipment.inventoryItemId },
        data: { availableStock: { decrement: diff } },
      });
    }

    return this.prisma.eventEquipment.update({
      where: { id: equipmentId },
      data: {
        ...(dto.quantityReserved !== undefined && {
          quantityReserved: dto.quantityReserved,
        }),
        ...(dto.returnedQuantity !== undefined && {
          returnedQuantity: dto.returnedQuantity,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { inventoryItem: true },
    });
  }

  async removeEquipment(eventFolderId: string, equipmentId: string) {
    const equipment = await this.prisma.eventEquipment.findFirst({
      where: { id: equipmentId, eventFolderId },
      include: { inventoryItem: true },
    });

    if (!equipment) {
      throw new NotFoundException("Assignation d'équipement introuvable");
    }

    await this.prisma.$transaction([
      this.prisma.eventEquipment.delete({ where: { id: equipmentId } }),
      // Restore stock
      ...(equipment.inventoryItem.type === "INTERNAL"
        ? [
            this.prisma.inventoryItem.update({
              where: { id: equipment.inventoryItemId },
              data: {
                availableStock: {
                  increment: equipment.quantityReserved,
                },
              },
            }),
          ]
        : []),
    ]);
  }

  async returnEquipment(
    eventFolderId: string,
    equipmentId: string,
    returnedQuantity: number,
    notes?: string,
  ) {
    const equipment = await this.prisma.eventEquipment.findFirst({
      where: { id: equipmentId, eventFolderId },
      include: { inventoryItem: true },
    });

    if (!equipment) {
      throw new NotFoundException("Assignation d'équipement introuvable");
    }

    if (returnedQuantity > equipment.quantityReserved) {
      throw new BadRequestException(
        `Quantité retournée (${returnedQuantity}) supérieure à la quantité réservée (${equipment.quantityReserved})`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.eventEquipment.update({
        where: { id: equipmentId },
        data: {
          returnedQuantity,
          notes: notes || equipment.notes,
        },
        include: { inventoryItem: true },
      }),
      // Restore returned quantity to stock
      ...(equipment.inventoryItem.type === "INTERNAL"
        ? [
            this.prisma.inventoryItem.update({
              where: { id: equipment.inventoryItemId },
              data: {
                availableStock: {
                  increment: returnedQuantity - equipment.returnedQuantity,
                },
              },
            }),
          ]
        : []),
    ]);

    return updated;
  }

  // ==================== STATS ====================

  async getStats() {
    const [byStatus, byEventType, total, upcoming] = await Promise.all([
      this.prisma.eventFolder.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.eventFolder.groupBy({
        by: ["eventType"],
        _count: { _all: true },
      }),
      this.prisma.eventFolder.count(),
      this.prisma.eventFolder.count({
        where: {
          schedules: { some: { date: { gte: new Date() } } },
          status: { in: [EventStatus.BOOKED, EventStatus.READY] },
        },
      }),
    ]);

    return {
      total,
      upcoming,
      byStatus: byStatus.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count._all }),
        {},
      ),
      byEventType: byEventType.reduce(
        (acc, s) => ({ ...acc, [s.eventType]: s._count._all }),
        {},
      ),
    };
  }

  async getUpcoming(days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.eventFolder.findMany({
      where: {
        schedules: { some: { date: { gte: new Date(), lte: future } } },
        status: { in: [EventStatus.BOOKED, EventStatus.READY] },
      },
      include: this.fullInclude(),
      orderBy: { createdAt: "asc" },
    });
  }
}
