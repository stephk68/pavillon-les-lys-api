import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EventType,
  Reservation,
  ReservationStatus,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { EmailService } from "../../common/services/email/email.service";
import { PrismaService } from "../../common/services/prisma.service";
import { CreateReservationBackOfficeDto } from "./dto/create-reservation-backoffice.dto";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { UpdateReservationDto } from "./dto/update-reservation.dto";

@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Trouve ou crée un client avec un mot de passe par défaut
   */
  async findOrCreateClient(clientData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) {
    // Chercher le client existant
    let client = await this.prisma.user.findUnique({
      where: { email: clientData.email },
    });

    if (!client) {
      // Créer un nouveau client avec mot de passe par défaut
      const defaultPassword = "Pavillon2024!"; // Mot de passe par défaut
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      client = await this.prisma.user.create({
        data: {
          email: clientData.email,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          phone: clientData.phone,
          password: hashedPassword,
          role: Role.CLIENT,
          isFirstLogin: true, // Forcer le changement de mot de passe à la première connexion
        },
      });

      console.log(
        `✅ Nouveau client créé: ${client.email} avec mot de passe par défaut`
      );

      // TODO: Envoyer un email avec les identifiants de connexion
      this.sendWelcomeEmail(client.email, client.firstName, defaultPassword);
    } else {
      // Mettre à jour les informations si différentes
      const needsUpdate =
        client.firstName !== clientData.firstName ||
        client.lastName !== clientData.lastName ||
        client.phone !== clientData.phone;

      if (needsUpdate) {
        client = await this.prisma.user.update({
          where: { id: client.id },
          data: {
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            phone: clientData.phone,
          },
        });
        console.log(`✅ Informations client mises à jour: ${client.email}`);
      }
    }

    return client;
  }

  /**
   * Envoie un email de bienvenue avec les identifiants
   */
  private async sendWelcomeEmail(
    email: string,
    firstName: string,
    password: string
  ) {
    try {
      await this.emailService.sendWelcomeEmail(email, firstName, password);
      console.log(`✅ Email de bienvenue envoyé à ${email}`);
    } catch (error) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      // Ne pas faire échouer la création de réservation si l'email échoue
    }
  }

  /**
   * Création de réservation depuis le back-office (avec infos client)
   */
  async createFromBackOffice(
    createReservationDto: CreateReservationBackOfficeDto,
    staffUserId: string
  ): Promise<Reservation> {
    console.log("🏢 Creating reservation from back-office:", {
      clientEmail: createReservationDto.clientEmail,
      eventType: createReservationDto.eventType,
      start: createReservationDto.start,
      end: createReservationDto.end,
    });

    // Trouver ou créer le client
    const client = await this.findOrCreateClient({
      email: createReservationDto.clientEmail,
      firstName: createReservationDto.clientFirstName,
      lastName: createReservationDto.clientLastName,
      phone: createReservationDto.clientPhone,
    });

    // Créer la réservation avec les données étendues
    const reservationData = {
      eventType: createReservationDto.eventType,
      start: createReservationDto.start,
      end: createReservationDto.end,
      attendees: createReservationDto.attendees,
      description: createReservationDto.description,
      specialRequests: createReservationDto.specialRequests,
      estimatedBudget: createReservationDto.estimatedBudget,
    };

    return this.create(reservationData, client.id, staffUserId);
  }

  /**
   * Création de réservation standard (front-office ou back-office simple)
   */
  async create(
    createReservationDto: CreateReservationDto | any,
    userId: string,
    createdBy?: string // ID du staff qui crée la réservation (optionnel)
  ): Promise<Reservation> {
    const startDate = new Date(createReservationDto.start);
    const endDate = new Date(createReservationDto.end);

    // Log pour debug
    console.log("🔍 Creating reservation:", {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      eventType: createReservationDto.eventType,
      attendees: createReservationDto.attendees,
      userId,
    });

    // Vérifier que les dates sont valides
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException("Les dates fournies ne sont pas valides");
    }

    // Vérifier que la date de début est dans le futur
    if (startDate <= new Date()) {
      throw new BadRequestException("La date de début doit être dans le futur");
    }

    // Vérifier que la date de fin est après la date de début
    if (endDate <= startDate) {
      throw new BadRequestException(
        "La date de fin doit être après la date de début"
      );
    }

    // Vérifier la durée minimale (au moins 1 heure)
    const durationHours =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (durationHours < 1) {
      throw new BadRequestException(
        "La durée minimum d'un événement est de 1 heure"
      );
    }

    // Vérifier les heures d'ouverture (9h-22h)
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();

    if (startHour < 9 || startHour >= 22) {
      throw new BadRequestException(
        "L'événement doit commencer entre 9h et 22h"
      );
    }

    if (endHour > 22 || (endHour === 22 && endDate.getMinutes() > 0)) {
      throw new BadRequestException("L'événement doit se terminer avant 22h");
    }

    // Vérifier les conflits de réservation
    console.log("🔍 Checking availability...");
    const isAvailable = await this.checkAvailability(startDate, endDate);

    if (!isAvailable) {
      // Récupérer les réservations conflictuelles pour plus de détails
      const conflictingReservations = await this.getConflictingReservations(
        startDate,
        endDate
      );
      const conflictDetails = conflictingReservations
        .map(
          (r) =>
            `${r.eventType} du ${r.start.toISOString()} au ${r.end.toISOString()}`
        )
        .join(", ");

      console.log("❌ Conflicts found:", conflictingReservations);

      throw new ConflictException(
        `Le créneau demandé n'est pas disponible. Conflits avec: ${conflictDetails}`
      );
    }

    console.log("✅ Slot available, creating reservation...");

    // Créer la réservation
    const reservationData: any = {
      eventType: createReservationDto.eventType,
      start: new Date(createReservationDto.start),
      end: new Date(createReservationDto.end),
      attendees: createReservationDto.attendees,
      userId,
      status: ReservationStatus.PENDING,
    };

    // Ajouter les champs optionnels s'ils existent
    if (createReservationDto.description) {
      reservationData.description = createReservationDto.description;
    }
    if (createReservationDto.specialRequests) {
      reservationData.specialRequests = createReservationDto.specialRequests;
    }
    if (createReservationDto.estimatedBudget) {
      reservationData.estimatedBudget = createReservationDto.estimatedBudget;
    }
    if (createdBy) {
      reservationData.createdBy = createdBy;
    }

    const reservation = await this.prisma.reservation.create({
      data: reservationData,
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
      orderBy: { start: "asc" },
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
    updateReservationDto: UpdateReservationDto
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
          "La date de fin doit être après la date de début"
        );
      }

      // Vérifier les conflits (exclure la réservation actuelle)
      const isAvailable = await this.checkAvailability(newStart, newEnd, id);
      if (!isAvailable) {
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
    status: ReservationStatus
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
        "Vous ne pouvez annuler que vos propres réservations"
      );
    }

    // Vérifier que la réservation peut être annulée
    if (reservation.status === ReservationStatus.CANCELED) {
      throw new BadRequestException("Cette réservation est déjà annulée");
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException(
        "Impossible d'annuler une réservation terminée"
      );
    }

    return this.updateStatus(id, ReservationStatus.CANCELED);
  }

  async confirm(id: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        "Seules les réservations en attente peuvent être confirmées"
      );
    }

    return this.updateStatus(id, ReservationStatus.CONFIRMED);
  }

  async complete(id: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        "Seules les réservations confirmées peuvent être marquées comme terminées"
      );
    }

    // Vérifier que la date est passée
    if (new Date(reservation.end) > new Date()) {
      throw new BadRequestException(
        "La réservation ne peut être marquée comme terminée qu'après sa date de fin"
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
        "Impossible de supprimer une réservation avec des paiements associés"
      );
    }

    await this.prisma.reservation.delete({
      where: { id },
    });
  }

  async checkAvailability(
    start: Date | string,
    end: Date | string,
    excludeReservationId?: string
  ): Promise<boolean> {
    const conflictingReservations = await this.getConflictingReservations(
      start,
      end,
      excludeReservationId
    );
    return conflictingReservations.length === 0;
  }

  async getConflictingReservations(
    start: Date | string,
    end: Date | string,
    excludeReservationId?: string
  ): Promise<any[]> {
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

    return this.prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getAvailableSlots(date: Date): Promise<any[]> {
    // Configuration des heures d'ouverture
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0); // Ouverture à 9h

    const dayEnd = new Date(date);
    dayEnd.setHours(22, 0, 0, 0); // Fermeture à 22h

    // Récupérer toutes les réservations du jour
    const reservations = await this.prisma.reservation.findMany({
      where: {
        start: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
      },
      orderBy: { start: "asc" },
    });

    // Créer les créneaux libres
    const freeSlots = [];
    let currentTime = new Date(dayStart);

    for (const reservation of reservations) {
      // Si il y a un gap avant cette réservation
      if (currentTime < reservation.start) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(reservation.start),
          duration:
            (reservation.start.getTime() - currentTime.getTime()) / (1000 * 60), // en minutes
        });
      }
      currentTime = new Date(
        Math.max(currentTime.getTime(), reservation.end.getTime())
      );
    }

    // Ajouter le dernier créneau si il reste du temps
    if (currentTime < dayEnd) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(dayEnd),
        duration: (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60), // en minutes
      });
    }

    return freeSlots;
  }

  // Nouvelle méthode pour debug les conflits
  async debugAvailability(
    start: Date | string,
    end: Date | string
  ): Promise<any> {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const conflictingReservations = await this.getConflictingReservations(
      startDate,
      endDate
    );
    const availableSlots = await this.getAvailableSlots(startDate);

    return {
      requestedSlot: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration: (endDate.getTime() - startDate.getTime()) / (1000 * 60), // en minutes
      },
      isAvailable: conflictingReservations.length === 0,
      conflictingReservations: conflictingReservations.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        start: r.start.toISOString(),
        end: r.end.toISOString(),
        status: r.status,
        user: r.user?.firstName + " " + r.user?.lastName,
      })),
      availableSlotsForDay: availableSlots,
    };
  }

  async getUserReservations(userId: string): Promise<Reservation[]> {
    return this.findAll({ userId });
  }

  async getReservationStats() {
    const stats = await this.prisma.reservation.groupBy({
      by: ["status"],
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
