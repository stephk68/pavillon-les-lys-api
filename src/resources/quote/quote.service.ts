import {
    BadRequestException,
    ConflictException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Quote, QuoteItem, QuoteStatus, Reservation, ReservationStatus } from "@prisma/client";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { MailService } from "../../mail/mail.service";
import { ReservationService } from "../reservation/reservation.service";
import { ConvertToReservationDto } from "./dto/convert-to-reservation.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto } from "./dto/update-quote.dto";

type QuoteWithItems = Quote & { items: QuoteItem[] };

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => ReservationService))
    private readonly reservationService: ReservationService
  ) {}

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
    // TVA désactivée pour le moment (vatRate = 0)
    const vatRate = 0; // 0% - À réactiver ultérieurement si nécessaire
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

    // Exclure les champs qui ne peuvent pas être mis à jour directement via Prisma
    const { items, validUntil, userId, reservationId, eventDetails, ...rest } = updateQuoteDto;

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

    // Construire l'objet data pour Prisma
    const updateData: any = {
      ...rest,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      ...financialData,
      ...itemsOperation,
    };

    // Gérer eventDetails si fourni (c'est un champ JSON)
    if (eventDetails !== undefined) {
      updateData.eventDetails = eventDetails;
    }

    return this.prisma.quote.update({
      where: { id },
      data: updateData,
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

  /**
   * Génère un PDF pour le devis
   */
  async generatePdf(id: string): Promise<Buffer> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        items: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reservation: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Devis ${id} introuvable`);
    }

    const formatDate = (date: Date) =>
      new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const clientName = quote.user
      ? `${quote.user.firstName || ""} ${quote.user.lastName || ""}`.trim() ||
        "Client"
      : "Client";

    const pdfData = {
      number: quote.number,
      date: formatDate(quote.createdAt),
      validUntil: formatDate(quote.validUntil),
      client: {
        name: clientName,
        email: quote.user?.email,
        phone: quote.user?.phone,
      },
      items: quote.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      totalHT: Number(quote.totalHT),
      vatRate: Number(quote.vatRate),
      totalTTC: Number(quote.totalTTC),
      notes:
        "Conditions de paiement: 30% à la commande, solde avant l'événement. Annulation gratuite jusqu'à 30 jours avant l'événement.",
    };

    return this.pdfService.generateQuotePdf(pdfData);
  }

  /**
   * Envoie le devis par email avec le PDF en pièce jointe
   */
  async sendQuoteWithPdf(id: string, recipientEmail?: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        items: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reservation: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Devis ${id} introuvable`);
    }

    if (
      quote.status !== QuoteStatus.DRAFT &&
      quote.status !== QuoteStatus.SENT
    ) {
      throw new BadRequestException(
        "Seuls les brouillons ou devis déjà envoyés peuvent être (ré)envoyés"
      );
    }

    // Générer le PDF
    const pdfBuffer = await this.generatePdf(id);

    // Déterminer le destinataire
    const email = recipientEmail || quote.user?.email;
    if (!email) {
      throw new BadRequestException(
        "Aucune adresse email disponible pour l'envoi"
      );
    }

    // Envoyer l'email avec le PDF en pièce jointe
    await this.mailService.sendQuoteWithAttachment(
      {
        email,
        firstName: quote.user?.firstName || "Client",
        lastName: quote.user?.lastName || "",
      },
      {
        id: quote.id,
        reference: quote.number,
        createdAt: quote.createdAt,
        items: quote.items,
        totalHT: Number(quote.totalHT),
        totalTTC: Number(quote.totalTTC),
        notes: "",
      },
      pdfBuffer
    );

    // Mettre à jour le statut du devis
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

  // ============================================================================
  // SALES FUNNEL - Méthodes pour le workflow flexible
  // ============================================================================

  /**
   * Crée un devis standalone (sans réservation)
   * Stocke les détails de l'événement dans eventDetails pour conversion ultérieure
   */
  async createStandalone(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const { userId, items, validUntil, eventDetails } = createQuoteDto;

    if (!eventDetails) {
      throw new BadRequestException(
        "eventDetails est requis pour un devis standalone (mode Funnel)"
      );
    }

    // Validation des dates de l'événement
    const desiredStart = new Date(eventDetails.desiredStartDate);
    const desiredEnd = new Date(eventDetails.desiredEndDate);

    if (desiredEnd <= desiredStart) {
      throw new BadRequestException(
        "La date de fin souhaitée doit être après la date de début"
      );
    }

    // Calculs financiers
    const { totalHT, totalTTC } = this.calculateTotals(items);

    // Construire les données (cast en any car eventDetails/version pas encore dans le type Prisma)
    const quoteData: any = {
      number: this.generateQuoteNumber(),
      userId,
      reservationId: null, // Pas de réservation pour un devis standalone
      eventDetails: eventDetails, // Stockage JSON
      validUntil: new Date(validUntil),
      status: QuoteStatus.DRAFT,
      version: 1,
      totalHT,
      vatRate: 0,
      totalTTC,
      items: {
        create: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      },
    };

    const quote = await this.prisma.quote.create({
      data: quoteData,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return quote;
  }

  /**
   * Convertit un devis ACCEPTED en réservation
   * Vérifie la disponibilité et crée la réservation avec les données du devis
   */
  async convertToReservation(
    quoteId: string,
    dto?: ConvertToReservationDto
  ): Promise<Reservation> {
    const quote = await this.findOne(quoteId);

    // Vérification du statut
    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException(
        "Seul un devis avec le statut ACCEPTED peut être converti en réservation"
      );
    }

    // Vérification qu'il n'y a pas déjà une réservation liée
    if (quote.reservationId) {
      throw new BadRequestException(
        "Ce devis est déjà lié à une réservation existante"
      );
    }

    // Vérification des eventDetails (cast nécessaire car migration non encore exécutée)
    const quoteData = quote as any;
    if (!quoteData.eventDetails) {
      throw new BadRequestException(
        "Ce devis ne contient pas de détails d'événement (eventDetails). Impossible de le convertir."
      );
    }

    const details = quoteData.eventDetails as {
      eventType: string;
      desiredStartDate: string;
      desiredEndDate: string;
      attendees: number;
    };

    const startDate = new Date(details.desiredStartDate);
    const endDate = new Date(details.desiredEndDate);

    // Vérifier la disponibilité des dates
    const isAvailable = await this.reservationService.checkAvailability(
      startDate,
      endDate
    );

    if (!isAvailable) {
      throw new ConflictException(
        "Les dates souhaitées ne sont plus disponibles. Veuillez proposer de nouvelles dates au client."
      );
    }

    // Transaction : créer la réservation + mettre à jour le devis
    return this.prisma.$transaction(async (tx) => {
      // Créer la réservation
      const reservation = await tx.reservation.create({
        data: {
          userId: quote.userId,
          eventType: details.eventType as any,
          start: startDate,
          end: endDate,
          attendees: details.attendees,
          status: ReservationStatus.CONFIRMED, // Directement confirmée car devis accepté
          estimatedBudget: quote.totalTTC,
          description: dto?.description,
          specialRequests: dto?.specialRequests,
          quoteId: quote.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      // Mettre à jour le devis avec le lien vers la réservation
      await tx.quote.update({
        where: { id: quoteId },
        data: { reservationId: reservation.id },
      });

      return reservation;
    });
  }
}
