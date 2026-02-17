import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Feedback } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { UpdateFeedbackDto } from "./dto/update-feedback.dto";

interface FindAllOptions {
  userId?: string;
  eventFolderId?: string;
  rating?: number;
  isRead?: boolean;
  skip?: number;
  take?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  responseRate: number;
  unreadCount: number;
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un nouveau feedback
   */
  async create(
    createFeedbackDto: CreateFeedbackDto,
    userId: string,
  ): Promise<Feedback> {
    return this.prisma.feedback.create({
      data: {
        userId,
        eventFolderId: createFeedbackDto.eventFolderId,
        rating: createFeedbackDto.rating,
        comment: createFeedbackDto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
          },
        },
      },
    });
  }

  /**
   * Récupérer tous les feedbacks avec filtres et pagination
   */
  async findAll(options: FindAllOptions = {}) {
    const {
      userId,
      eventFolderId,
      rating,
      isRead,
      skip = 0,
      take = 50,
      startDate,
      endDate,
    } = options;

    const where: any = {};

    if (userId) where.userId = userId;
    if (eventFolderId) where.eventFolderId = eventFolderId;
    if (rating !== undefined) where.rating = rating;
    if (isRead !== undefined) where.isRead = isRead;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
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
            },
          },
          eventFolder: {
            select: {
              id: true,
              eventType: true,
              start: true,
              end: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  /**
   * Récupérer un feedback par ID
   */
  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback avec l'ID ${id} non trouvé`);
    }

    return feedback;
  }

  /**
   * Mettre à jour un feedback
   */
  async update(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
    userId?: string,
  ): Promise<Feedback> {
    const feedback = await this.findOne(id);

    // Vérifier que l'utilisateur est le propriétaire (si userId fourni)
    if (userId && feedback.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres feedbacks",
      );
    }

    return this.prisma.feedback.update({
      where: { id },
      data: {
        rating: updateFeedbackDto.rating,
        comment: updateFeedbackDto.comment,
      },
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

  /**
   * Supprimer un feedback
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Vérifier l'existence
    await this.prisma.feedback.delete({ where: { id } });
  }

  /**
   * Obtenir les statistiques des feedbacks
   */
  async getStats(): Promise<FeedbackStats> {
    const [
      totalFeedbacks,
      avgResult,
      distribution,
      respondedCount,
      unreadCount,
    ] = await Promise.all([
      this.prisma.feedback.count(),
      this.prisma.feedback.aggregate({
        _avg: { rating: true },
      }),
      this.prisma.feedback.groupBy({
        by: ["rating"],
        _count: true,
      }),
      this.prisma.feedback.count({
        where: { response: { not: null } },
      }),
      this.prisma.feedback.count({
        where: { isRead: false },
      }),
    ]);

    const ratingDistribution = distribution.map((d) => ({
      rating: d.rating,
      count: d._count,
    }));

    // Compléter avec les ratings manquants (1-5)
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution.find((r) => r.rating === i)) {
        ratingDistribution.push({ rating: i, count: 0 });
      }
    }
    ratingDistribution.sort((a, b) => a.rating - b.rating);

    return {
      totalFeedbacks,
      averageRating: avgResult._avg.rating || 0,
      ratingDistribution,
      responseRate:
        totalFeedbacks > 0 ? (respondedCount / totalFeedbacks) * 100 : 0,
      unreadCount,
    };
  }

  /**
   * Obtenir les feedbacks non lus
   */
  async getUnreadFeedbacks(): Promise<Feedback[]> {
    return this.prisma.feedback.findMany({
      where: { isRead: false },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        eventFolder: {
          select: {
            id: true,
            eventType: true,
            start: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Répondre à un feedback
   */
  async respondToFeedback(id: string, response: string): Promise<Feedback> {
    await this.findOne(id); // Vérifier l'existence

    return this.prisma.feedback.update({
      where: { id },
      data: {
        response,
        respondedAt: new Date(),
        isRead: true, // Automatiquement marquer comme lu
      },
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

  /**
   * Marquer un feedback comme lu
   */
  async markAsRead(id: string): Promise<Feedback> {
    await this.findOne(id); // Vérifier l'existence

    return this.prisma.feedback.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
