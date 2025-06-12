import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Payment, PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationService } from '../reservation/reservation.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    // Vérifier que la réservation existe et appartient à l'utilisateur
    const reservation = await this.reservationService.findOne(
      createPaymentDto.reservationId,
    );

    if (reservation.userId !== userId) {
      throw new BadRequestException(
        'Vous ne pouvez payer que vos propres réservations',
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
      throw new ConflictException('Cette réservation a déjà été payée');
    }

    // Créer le paiement
    const payment = await this.prisma.payment.create({
      data: {
        ...createPaymentDto,
        userId,
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
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    return this.prisma.payment.findMany({
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
      orderBy: { paidAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
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
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Paiement avec l'ID ${id} non trouvé`);
    }

    return payment;
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
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
        'Seuls les paiements validés peuvent être remboursés',
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
        'Impossible de supprimer un paiement validé',
      );
    }

    await this.prisma.payment.delete({
      where: { id },
    });
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.findAll({ userId });
  }

  async getReservationPayments(reservationId: string): Promise<Payment[]> {
    return this.findAll({ reservationId });
  }

  async getPaymentStats() {
    const stats = await this.prisma.payment.groupBy({
      by: ['status'],
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

  async getPendingPayments(): Promise<Payment[]> {
    return this.findAll({ status: PaymentStatus.PENDING });
  }

  async getFailedPayments(): Promise<Payment[]> {
    return this.findAll({ status: PaymentStatus.REFUNDED });
  }

  // Simulation de traitement de paiement (à remplacer par votre gateway)
  async processPayment(
    paymentId: string,
    paymentMethod: any,
  ): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Ce paiement ne peut pas être traité');
    }

    try {
      // Ici, vous intégreriez votre gateway de paiement (Stripe, PayPal, etc.)
      // const result = await this.stripeService.processPayment(payment.amount, paymentMethod);

      // Simulation d'un paiement réussi
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return this.markAsPaid(paymentId);
    } catch (error) {
      await this.markAsFailed(paymentId);
      throw new BadRequestException('Échec du traitement du paiement');
    }
  }

  async createInvoice(paymentId: string): Promise<any> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Une facture ne peut être générée que pour un paiement validé',
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
      throw new NotFoundException('Client non trouvé pour ce paiement');
    }

    // Information de la réservation associée
    const reservation = await this.reservationService.findOne(
      payment.reservationId,
    );

    if (!reservation) {
      throw new NotFoundException('Réservation non trouvée pour ce paiement');
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
}
