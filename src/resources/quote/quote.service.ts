import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Quote, QuoteItem, QuoteStatus } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto } from "./dto/update-quote.dto";

type QuoteWithItems = Quote & { items: QuoteItem[] };

@Injectable()
export class QuoteService {
  constructor(private readonly prisma: PrismaService) {}

  // --- LOGIQUE MÉTIER ---

  private generateQuoteNumber(): string {
    // Format : DEV-YYYYMM-XXXX (ex: DEV-202512-AB12)
    const date = new Date().toISOString().slice(0, 7).replace("-", "");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DEV-${date}-${random}`;
  }

  private calculateTotals(items: { quantity: number; unitPrice: number }[]) {
    const totalHT = items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0
    );
    const vatRate = 0.18; // 18%
    const taxes = totalHT * vatRate;
    const totalTTC = totalHT + taxes;

    return { totalHT, taxes, totalTTC };
  }

  // --- CRUD ---

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const { userId, reservationId, items, validUntil } = createQuoteDto;

    // 1. Calculs financiers
    const { totalHT, taxes, totalTTC } = this.calculateTotals(items);

    // 2. Création Transactionnelle (Quote + Items + Reservation Link)
    return this.prisma.$transaction(async (tx) => {
      // Vérifier unicité réservation si fournie
      if (reservationId) {
        const existing = await tx.quote.findFirst({ where: { reservationId } });
        if (existing)
          throw new BadRequestException(
            "Un devis existe déjà pour cette réservation."
          );
      }

      const quote = await tx.quote.create({
        data: {
          number: this.generateQuoteNumber(),
          userId,
          reservationId, // Peut être null
          validUntil: new Date(validUntil),
          status: QuoteStatus.DRAFT,
          totalHT,
          vatRate: 18.0,
          totalTTC,
          // Création des lignes via la relation Prisma
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true, reservation: true },
      });

      return quote;
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    status?: QuoteStatus;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (options?.status) where.status = options.status;
    if (options?.userId) where.userId = options.userId;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = new Date(options.startDate);
      if (options.endDate) where.createdAt.lte = new Date(options.endDate);
    }

    return this.prisma.quote.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        reservation: true,
      },
    });
  }

  async findOne(id: string): Promise<QuoteWithItems> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        items: true, // Important : récupérer les lignes
        user: true,
        reservation: true,
      },
    });
    if (!quote) throw new NotFoundException(`Devis ${id} introuvable`);
    return quote;
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    const quote = await this.findOne(id);
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException(
        "Seul un devis en brouillon peut être modifié."
      );
    }

    const { items, validUntil, ...rest } = updateQuoteDto;

    // Si on met à jour les items, on recalcule tout
    let financialData = {};
    let itemsOperation = {};

    if (items) {
      const { totalHT, taxes, totalTTC } = this.calculateTotals(items);
      financialData = { totalHT, taxes, totalTTC }; // Pas de TVA dans la base, on stocke le montant calculé ou le taux ? Ici j'ai supposé stocker le montant taxes.

      // Stratégie : Supprimer les anciens items et recréer les nouveaux (plus simple pour la consistance)
      itemsOperation = {
        items: {
          deleteMany: {}, // Vide la liste
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      };
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        ...rest,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        ...financialData,
        ...itemsOperation,
      },
      include: { items: true },
    });
  }

  async updateStatus(id: string, status: QuoteStatus): Promise<Quote> {
    return this.prisma.quote.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.quote.delete({ where: { id } });
  }

  async findByReservationId(reservationId: string): Promise<Quote | null> {
    return this.prisma.quote.findFirst({
      where: { reservationId },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reservation: true,
      },
    });
  }

  async duplicate(id: string): Promise<Quote> {
    const originalQuote = await this.findOne(id);
    const { totalHT, totalTTC } = this.calculateTotals(
      originalQuote.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      }))
    );

    return this.prisma.quote.create({
      data: {
        number: this.generateQuoteNumber(),
        userId: originalQuote.userId,
        totalHT,
        vatRate: originalQuote.vatRate,
        totalTTC,
        validUntil: originalQuote.validUntil,
        status: QuoteStatus.DRAFT,
        items: {
          create: originalQuote.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  async sendQuote(id: string, recipientEmail?: string): Promise<Quote> {
    const quote = await this.findOne(id);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException(
        "Seuls les brouillons peuvent être envoyés"
      );
    }

    // TODO: Implémenter l'envoi d'email avec le système de mail
    // Pour l'instant, on change juste le statut

    return this.prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.SENT },
      include: {
        items: true,
        user: true,
        reservation: true,
      },
    });
  }

  async approveQuote(id: string): Promise<Quote> {
    const quote = await this.findOne(id);

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException("Ce devis est déjà accepté");
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.ACCEPTED },
      include: {
        items: true,
        user: true,
        reservation: true,
      },
    });
  }

  async rejectQuote(id: string, reason: string): Promise<Quote> {
    const quote = await this.findOne(id);

    if (quote.status === QuoteStatus.REJECTED) {
      throw new BadRequestException("Ce devis est déjà rejeté");
    }

    // TODO: Stocker la raison du rejet (ajouter un champ dans le schéma si nécessaire)

    return this.prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.REJECTED },
      include: {
        items: true,
        user: true,
        reservation: true,
      },
    });
  }

  async getQuoteStats() {
    const totalQuotes = await this.prisma.quote.count();

    const totalAmount = await this.prisma.quote.aggregate({
      _sum: { totalTTC: true },
    });

    const quotesByStatus = await Promise.all(
      Object.values(QuoteStatus).map(async (status) => ({
        status,
        count: await this.prisma.quote.count({ where: { status } }),
      }))
    );

    return {
      totalQuotes,
      totalAmount: totalAmount._sum.totalTTC || 0,
      quotesByStatus,
    };
  }

  async exportQuote(id: string): Promise<any> {
    const quote = await this.findOne(id);

    // Logique d'export (PDF, Excel, etc.)
    return {
      quote,
      exportDate: new Date(),
      format: "json", // À adapter selon vos besoins
    };
  }
}
