import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Payment, PaymentStatus, PaymentType, Role } from "@prisma/client";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { ReservationService } from "../reservation/reservation.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
    private readonly pdfService: PdfService
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    user: any
  ): Promise<Payment> {
    // Vérifier que la réservation existe
    const reservation = await this.reservationService.findOne(
      createPaymentDto.reservationId
    );

    // Seuls les admins et EVENT_MANAGER peuvent créer des paiements pour d'autres utilisateurs
    if (
      reservation.userId !== user.id &&
      user.role !== Role.ADMIN &&
      user.role !== Role.EVENT_MANAGER
    ) {
      throw new BadRequestException(
        "Vous ne pouvez payer que vos propres réservations"
      );
    }

    // Vérifier qu'il n'y a pas déjà un paiement validé pour cette réservation
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        reservationId: createPaymentDto.reservationId,
        status: PaymentStatus.PAID,
      },
    });

    if (existingPayment) {
      throw new ConflictException("Cette réservation a déjà été payée");
    }

    // Créer le paiement avec l'userId de la réservation (pas de l'admin qui crée)
    const payment = await this.prisma.payment.create({
      data: {
        ...createPaymentDto,
        userId: reservation.userId, // Utiliser l'userId de la réservation
        status: PaymentStatus.PENDING,
        paidAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reservation: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
            attendees: true,
          },
        },
      },
    });

    return payment;
  }

  async findAll(options?: {
    status?: PaymentStatus;
    type?: PaymentType;
    userId?: string;
    reservationId?: string;
    skip?: number;
    take?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      status,
      type,
      userId,
      reservationId,
      skip = 0,
      take = 50,
      startDate,
      endDate,
    } = options || {};

    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (reservationId) where.reservationId = reservationId;

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          reservation: {
            select: {
              id: true,
              eventType: true,
              start: true,
              end: true,
              attendees: true,
            },
          },
        },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        reservation: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
            attendees: true,
            status: true,
            description: true,
            estimatedBudget: true,
            quote: {
              select: {
                id: true,
                number: true,
                totalTTC: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Paiement avec l'ID ${id} non trouvé`);
    }

    // Récupérer l'historique des paiements de cette réservation
    const reservationPayments = await this.prisma.payment.findMany({
      where: { reservationId: payment.reservationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
      },
    });

    // Calculer le résumé financier
    const totalAmount = payment.reservation?.quote?.totalTTC 
      ? Number(payment.reservation.quote.totalTTC)
      : payment.reservation?.estimatedBudget 
        ? Number(payment.reservation.estimatedBudget) 
        : 0;

    const paidAmount = reservationPayments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingAmount = reservationPayments
      .filter(p => p.status === PaymentStatus.PENDING)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remainingAmount = totalAmount - paidAmount;
    const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    // Prochain paiement à payer
    const nextDuePayment = reservationPayments.find(
      p => p.status === PaymentStatus.PENDING && p.dueDate
    );

    return {
      ...payment,
      paymentHistory: reservationPayments,
      financialSummary: {
        totalAmount,
        paidAmount,
        pendingAmount,
        remainingAmount,
        paymentProgress: Math.round(paymentProgress * 100) / 100,
        paymentsCount: reservationPayments.length,
        paidPaymentsCount: reservationPayments.filter(p => p.status === PaymentStatus.PAID).length,
      },
      nextDuePayment,
    };
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto
  ): Promise<Payment> {
    // Vérifier que le paiement existe
    await this.findOne(id);

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reservation: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
            attendees: true,
          },
        },
      },
    });

    return updatedPayment;
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    const payment = await this.findOne(id);

    // Si le paiement est confirmé, confirmer aussi la réservation
    if (
      status === PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PAID
    ) {
      await this.reservationService.confirm(payment.reservationId);
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status,
        paidAt: status === PaymentStatus.PAID ? new Date() : payment.paidAt,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reservation: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
            attendees: true,
          },
        },
      },
    });
  }

  async markAsPaid(id: string): Promise<Payment> {
    return this.updateStatus(id, PaymentStatus.PAID);
  }

  async markAsFailed(id: string): Promise<Payment> {
    return this.updateStatus(id, PaymentStatus.REFUNDED);
  }

  async refund(id: string): Promise<Payment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        "Seuls les paiements validés peuvent être remboursés"
      );
    }

    // Marquer le paiement comme remboursé
    const refundedPayment = await this.updateStatus(id, PaymentStatus.REFUNDED);

    // Optionnel: Annuler la réservation associée
    await this.reservationService.cancel(payment.reservationId);

    return refundedPayment;
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        "Impossible de supprimer un paiement validé"
      );
    }

    await this.prisma.payment.delete({
      where: { id },
    });
  }

  async getUserPayments(userId: string) {
    return this.findAll({ userId });
  }

  async getReservationPayments(reservationId: string) {
    return this.findAll({ reservationId });
  }

  /**
   * Résumé financier complet d'une réservation
   * Retourne: réservation, tous les paiements, totaux calculés
   */
  async getReservationPaymentSummary(reservationId: string) {
    // Récupérer la réservation avec le devis
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
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
        quote: {
          select: {
            id: true,
            number: true,
            totalHT: true,
            totalTTC: true,
            vatRate: true,
            status: true,
            items: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation avec l'ID ${reservationId} non trouvée`);
    }

    // Récupérer tous les paiements de cette réservation
    const payments = await this.prisma.payment.findMany({
      where: { reservationId },
      orderBy: { createdAt: "asc" },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculer le prix total (devis prioritaire, sinon estimatedBudget)
    const totalAmount = reservation.quote?.totalTTC
      ? Number(reservation.quote.totalTTC)
      : reservation.estimatedBudget
        ? Number(reservation.estimatedBudget)
        : 0;

    // Calculer les montants par statut
    const paidAmount = payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingAmount = payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const refundedAmount = payments
      .filter(p => p.status === PaymentStatus.REFUNDED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    // Prochain paiement dû
    const nextDuePayment = payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })[0];

    // Paiements en retard
    const now = new Date();
    const overduePayments = payments.filter(
      p => p.status === PaymentStatus.PENDING && p.dueDate && new Date(p.dueDate) < now
    );

    return {
      reservation,
      payments,
      summary: {
        totalAmount,
        paidAmount,
        pendingAmount,
        refundedAmount,
        remainingAmount,
        paymentProgress: Math.round(paymentProgress * 100) / 100,
        paymentsCount: payments.length,
        paidPaymentsCount: payments.filter(p => p.status === PaymentStatus.PAID).length,
        pendingPaymentsCount: payments.filter(p => p.status === PaymentStatus.PENDING).length,
        overduePaymentsCount: overduePayments.length,
        isFullyPaid: remainingAmount === 0 && totalAmount > 0,
        hasQuote: !!reservation.quote,
        quoteStatus: reservation.quote?.status || null,
      },
      nextDuePayment: nextDuePayment || null,
      overduePayments,
    };
  }

  async getPaymentStats() {
    const stats = await this.prisma.payment.groupBy({
      by: ["status"],
      _count: true,
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { amount: true },
    });

    const totalPayments = await this.prisma.payment.count();

    return {
      totalPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      byStatus: stats,
    };
  }

  async getMonthlyRevenue(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const revenue = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      month,
      year,
      revenue: revenue._sum.amount || 0,
      count: revenue._count,
    };
  }

  async getPendingPayments() {
    return this.findAll({ status: PaymentStatus.PENDING });
  }

  async getFailedPayments() {
    return this.findAll({ status: PaymentStatus.REFUNDED });
  }

  // Simulation de traitement de paiement (à remplacer par votre gateway)
  async processPayment(
    paymentId: string,
    paymentMethod: any
  ): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException("Ce paiement ne peut pas être traité");
    }

    try {
      // Ici, vous intégreriez votre gateway de paiement (Stripe, PayPal, etc.)
      // const result = await this.stripeService.processPayment(payment.amount, paymentMethod);

      // Simulation d'un paiement réussi
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return this.markAsPaid(paymentId);
    } catch (error) {
      await this.markAsFailed(paymentId);
      throw new BadRequestException("Échec du traitement du paiement");
    }
  }

  async createInvoice(paymentId: string): Promise<any> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        "Une facture ne peut être générée que pour un paiement validé"
      );
    }

    // informations sur le client et la réservation
    const customer = this.prisma.user.findUnique({
      where: { id: payment.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!customer) {
      throw new NotFoundException("Client non trouvé pour ce paiement");
    }

    // Information de la réservation associée
    const reservation = await this.reservationService.findOne(
      payment.reservationId
    );

    if (!reservation) {
      throw new NotFoundException("Réservation non trouvée pour ce paiement");
    }

    // Logique de génération de facture
    return {
      id: `INV-${payment.id}`,
      paymentId: payment.id,
      amount: payment.amount,
      date: payment.paidAt,
      customer: customer,
      reservation: reservation,
    };
  }

  /**
   * Génère un PDF de facture pour un paiement
   */
  async generateInvoicePdf(paymentId: string): Promise<Buffer> {
    const invoiceData = await this.createInvoice(paymentId);
    const payment = await this.findOne(paymentId);

    const formatDate = (date: Date) =>
      new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XOF",
        minimumFractionDigits: 0,
      }).format(amount);

    // Générer le HTML de la facture
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Facture ${invoiceData.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #8B7355; }
          .invoice-info { text-align: right; }
          .invoice-number { font-size: 24px; font-weight: bold; color: #8B7355; }
          .invoice-date { color: #666; margin-top: 5px; }
          .divider { height: 2px; background: linear-gradient(90deg, #8B7355, #D4AF37); margin: 30px 0; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; text-transform: uppercase; color: #8B7355; margin-bottom: 10px; letter-spacing: 1px; }
          .client-info { background: #f9f7f4; padding: 20px; border-radius: 8px; }
          .client-name { font-size: 18px; font-weight: bold; }
          .client-email { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #8B7355; color: white; padding: 12px 15px; text-align: left; }
          td { padding: 12px 15px; border-bottom: 1px solid #eee; }
          .amount { text-align: right; font-weight: bold; }
          .total-row { background: #f9f7f4; }
          .total-row td { font-size: 18px; font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
          .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #4CAF50; color: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">PAVILLON LES LYS</div>
          <div class="invoice-info">
            <div class="invoice-number">FACTURE ${invoiceData.id}</div>
            <div class="invoice-date">${formatDate(payment.paidAt || payment.createdAt)}</div>
            <div class="status-badge">PAYÉE</div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="section">
          <div class="section-title">Client</div>
          <div class="client-info">
            <div class="client-name">${invoiceData.customer?.firstName || ''} ${invoiceData.customer?.lastName || ''}</div>
            <div class="client-email">${invoiceData.customer?.email || ''}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Détail du paiement</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th class="amount">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Paiement pour réservation du ${formatDate(invoiceData.reservation?.start)}</td>
                <td>${payment.type}</td>
                <td class="amount">${formatCurrency(Number(payment.amount))}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2">Total</td>
                <td class="amount">${formatCurrency(Number(payment.amount))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>Pavillon Les Lys - Espace événementiel de prestige</p>
          <p>Merci pour votre confiance</p>
        </div>
      </body>
      </html>
    `;

    return this.pdfService.generatePdf(html, {
      format: "A4",
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });
  }
}
