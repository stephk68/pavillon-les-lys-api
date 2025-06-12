import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventType, Reservation, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createReservationDto: CreateReservationDto,
    userId: string,
  ): Promise<Reservation> {
    // Vérifier que la date de début est dans le futur
    if (new Date(createReservationDto.start) <= new Date()) {
      throw new BadRequestException('La date de début doit être dans le futur');
    }

    // Vérifier que la date de fin est après la date de début
    if (
      new Date(createReservationDto.end) <= new Date(createReservationDto.start)
    ) {
      throw new BadRequestException(
        'La date de fin doit être après la date de début',
      );
    }

    // Vérifier les conflits de réservation
    const conflictingReservation = await this.checkAvailability(
      createReservationDto.start,
      createReservationDto.end,
    );

    if (conflictingReservation) {
      throw new ConflictException("Le créneau demandé n'est pas disponible");
    }

    // Créer la réservation
    const reservation = await this.prisma.reservation.create({
      data: {
        ...createReservationDto,
        userId,
        status: ReservationStatus.PENDING,
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

    return reservation;
  }

  async findAll(options?: {
    status?: ReservationStatus;
    eventType?: EventType;
    userId?: string;
    skip?: number;
    take?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      status,
      eventType,
      userId,
      skip = 0,
      take = 50,
      startDate,
      endDate,
    } = options || {};

    const where: any = {};

    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.start = {};
      if (startDate) where.start.gte = startDate;
      if (endDate) where.start.lte = endDate;
    }

    return this.prisma.reservation.findMany({
      where,
      skip,
      take,
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
      orderBy: { start: 'asc' },
    });
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
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
        payments: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation avec l'ID ${id} non trouvée`);
    }

    return reservation;
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
  ): Promise<Reservation> {
    // Vérifier que la réservation existe
    const existingReservation = await this.findOne(id);

    // Si on modifie les dates, vérifier les conflits
    if (updateReservationDto.start || updateReservationDto.end) {
      const newStart = updateReservationDto.start || existingReservation.start;
      const newEnd = updateReservationDto.end || existingReservation.end;

      // Vérifier que les nouvelles dates sont cohérentes
      if (new Date(newEnd) <= new Date(newStart)) {
        throw new BadRequestException(
          'La date de fin doit être après la date de début',
        );
      }

      // Vérifier les conflits (exclure la réservation actuelle)
      const conflictingReservation = await this.checkAvailability(
        newStart,
        newEnd,
        id,
      );
      if (conflictingReservation) {
        throw new ConflictException("Le nouveau créneau n'est pas disponible");
      }
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: updateReservationDto,
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

    return updatedReservation;
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
  ): Promise<Reservation> {
    await this.findOne(id); // Vérifier que la réservation existe

    return this.prisma.reservation.update({
      where: { id },
      data: { status },
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
  }

  async cancel(id: string, userId?: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    // Vérifier que l'utilisateur peut annuler cette réservation
    if (userId && reservation.userId !== userId) {
      throw new BadRequestException(
        'Vous ne pouvez annuler que vos propres réservations',
      );
    }

    // Vérifier que la réservation peut être annulée
    if (reservation.status === ReservationStatus.CANCELED) {
      throw new BadRequestException('Cette réservation est déjà annulée');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException(
        "Impossible d'annuler une réservation terminée",
      );
    }

    return this.updateStatus(id, ReservationStatus.CANCELED);
  }

  async confirm(id: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Seules les réservations en attente peuvent être confirmées',
      );
    }

    return this.updateStatus(id, ReservationStatus.CONFIRMED);
  }

  async complete(id: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Seules les réservations confirmées peuvent être marquées comme terminées',
      );
    }

    // Vérifier que la date est passée
    if (new Date(reservation.end) > new Date()) {
      throw new BadRequestException(
        "La réservation ne peut être marquée comme terminée qu'après sa date de fin",
      );
    }

    return this.updateStatus(id, ReservationStatus.COMPLETED);
  }

  async remove(id: string): Promise<void> {
    const reservation = await this.findOne(id);

    // Vérifier qu'il n'y a pas de paiements associés
    const payments = await this.prisma.payment.findMany({
      where: {
        // Assumant qu'il y a une relation avec la réservation
        // Ajustez selon votre schéma Prisma
      },
    });

    if (payments.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une réservation avec des paiements associés',
      );
    }

    await this.prisma.reservation.delete({
      where: { id },
    });
  }

  async checkAvailability(
    start: Date | string,
    end: Date | string,
    excludeReservationId?: string,
  ): Promise<boolean> {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const where: any = {
      AND: [
        {
          start: {
            lt: endDate,
          },
        },
        {
          end: {
            gt: startDate,
          },
        },
        {
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      ],
    };

    if (excludeReservationId) {
      where.AND.push({
        id: {
          not: excludeReservationId,
        },
      });
    }

    const conflictingReservation = await this.prisma.reservation.findFirst({
      where,
    });

    return !conflictingReservation; // true si disponible, false si conflit
  }

  async getAvailableSlots(date: Date): Promise<any[]> {
    // Logique pour calculer les créneaux disponibles
    // À adapter selon vos règles métier
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0); // Ouverture à 9h

    const dayEnd = new Date(date);
    dayEnd.setHours(22, 0, 0, 0); // Fermeture à 22h

    const reservations = await this.prisma.reservation.findMany({
      where: {
        start: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
      },
      orderBy: { start: 'asc' },
    });

    // Logique pour calculer les créneaux libres
    // Retourner un tableau des créneaux disponibles
    return [];
  }

  async getUserReservations(userId: string): Promise<Reservation[]> {
    return this.findAll({ userId });
  }

  async getReservationStats() {
    const stats = await this.prisma.reservation.groupBy({
      by: ['status'],
      _count: true,
    });

    const totalReservations = await this.prisma.reservation.count();

    return {
      totalReservations,
      byStatus: stats,
    };
  }

  async getUpcomingReservations(days: number = 7): Promise<Reservation[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.findAll({
      startDate,
      endDate,
      status: ReservationStatus.CONFIRMED,
    });
  }
}
