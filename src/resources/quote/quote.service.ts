import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Quote } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationService } from '../reservation/reservation.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    // Vérifier que la réservation existe si elle est fournie
    if (createQuoteDto.reservationId) {
      await this.reservationService.findOne(createQuoteDto.reservationId);

      // Vérifier qu'il n'y a pas déjà un devis pour cette réservation
      const existingQuote = await this.findByReservationId(
        createQuoteDto.reservationId,
      );
      if (existingQuote) {
        throw new BadRequestException(
          'Un devis existe déjà pour cette réservation',
        );
      }
    }

    // Calculer le montant total à partir des items
    const totalAmount = this.calculateTotalAmount(createQuoteDto.items);

    const quote = await this.prisma.quote.create({
      data: {
        ...createQuoteDto,
        totalAmount,
      },
    });

    // Si le devis est lié à une réservation, mettre à jour la réservation
    if (createQuoteDto.reservationId) {
      await this.prisma.reservation.update({
        where: { id: createQuoteDto.reservationId },
        data: { quoteId: quote.id },
      });
    }

    return quote;
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    hasReservation?: boolean;
  }): Promise<Quote[]> {
    const { skip = 0, take = 50, hasReservation } = options || {};

    const where: any = {};
    if (hasReservation !== undefined) {
      where.reservation = hasReservation ? { isNot: null } : { is: null };
    }

    return this.prisma.quote.findMany({
      where,
      skip,
      take,
      include: {
        reservation: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<any> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        reservation: {
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
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Devis avec l'ID ${id} non trouvé`);
    }

    return quote;
  }

  async findByReservationId(reservationId: string): Promise<Quote | null> {
    return this.prisma.quote.findFirst({
      where: {
        reservation: {
          id: reservationId,
        },
      },
      include: {
        reservation: {
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
        },
      },
    });
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    // Vérifier que le devis existe
    await this.findOne(id);

    // Recalculer le montant total si les items sont modifiés
    let updateData: any = { ...updateQuoteDto };
    if (updateQuoteDto.items) {
      updateData.totalAmount = this.calculateTotalAmount(updateQuoteDto.items);
    }

    const updatedQuote = await this.prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        reservation: {
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
        },
      },
    });

    return updatedQuote;
  }

  async remove(id: string): Promise<void> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        reservation: true,
      },
    });

    // Si le devis est lié à une réservation, supprimer la référence
    if (quote.reservation) {
      await this.prisma.reservation.update({
        where: { id: quote.reservation.id },
        data: { quoteId: null },
      });
    }

    await this.prisma.quote.delete({
      where: { id },
    });
  }

  async duplicate(id: string): Promise<Quote> {
    const originalQuote = await this.findOne(id);

    const newQuote = await this.prisma.quote.create({
      data: {
        items: originalQuote.items,
        totalAmount: originalQuote.totalAmount,
        currency: originalQuote.currency,
        // Ne pas lier à la même réservation
      },
    });

    return newQuote;
  }

  async linkToReservation(
    quoteId: string,
    reservationId: string,
  ): Promise<Quote> {
    // Vérifier que le devis et la réservation existent
    await this.findOne(quoteId);
    await this.reservationService.findOne(reservationId);

    // Vérifier qu'il n'y a pas déjà un devis pour cette réservation
    const existingQuote = await this.findByReservationId(reservationId);
    if (existingQuote && existingQuote.id !== quoteId) {
      throw new BadRequestException(
        'Un autre devis est déjà lié à cette réservation',
      );
    }

    // Mettre à jour le devis et la réservation
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { quoteId },
    });

    return this.findOne(quoteId);
  }

  async unlinkFromReservation(quoteId: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        reservation: true,
      },
    });

    if (quote.reservation) {
      await this.prisma.reservation.update({
        where: { id: quote.reservation.id },
        data: { quoteId: null },
      });
    }

    return this.findOne(quoteId);
  }

  async addItem(quoteId: string, item: any): Promise<Quote> {
    const quote = await this.findOne(quoteId);
    const currentItems = Array.isArray(quote.items) ? quote.items : [];

    const newItems = [...currentItems, item];
    const newTotalAmount = this.calculateTotalAmount(newItems);

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        items: newItems,
        totalAmount: newTotalAmount,
      },
      include: {
        reservation: {
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
        },
      },
    });
  }

  async removeItem(quoteId: string, itemIndex: number): Promise<Quote> {
    const quote = await this.findOne(quoteId);
    const currentItems = Array.isArray(quote.items) ? quote.items : [];

    if (itemIndex < 0 || itemIndex >= currentItems.length) {
      throw new BadRequestException("Index d'item invalide");
    }

    const newItems = currentItems.filter((_, index) => index !== itemIndex);
    const newTotalAmount = this.calculateTotalAmount(newItems);

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        items: newItems,
        totalAmount: newTotalAmount,
      },
      include: {
        reservation: {
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
        },
      },
    });
  }

  async updateItem(
    quoteId: string,
    itemIndex: number,
    updatedItem: any,
  ): Promise<Quote> {
    const quote = await this.findOne(quoteId);
    const currentItems = Array.isArray(quote.items) ? quote.items : [];

    if (itemIndex < 0 || itemIndex >= currentItems.length) {
      throw new BadRequestException("Index d'item invalide");
    }

    const newItems = [...currentItems];
    const currentItem = newItems[itemIndex];
    newItems[itemIndex] =
      typeof currentItem === 'object' && currentItem !== null
        ? { ...currentItem, ...updatedItem }
        : updatedItem;
    const newTotalAmount = this.calculateTotalAmount(newItems);

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        items: newItems,
        totalAmount: newTotalAmount,
      },
      include: {
        reservation: {
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
        },
      },
    });
  }

  async getQuoteStats() {
    const totalQuotes = await this.prisma.quote.count();

    const totalAmount = await this.prisma.quote.aggregate({
      _sum: { totalAmount: true },
    });

    const quotesWithReservations = await this.prisma.quote.count({
      where: { reservation: { isNot: null } },
    });

    const quotesWithoutReservations = totalQuotes - quotesWithReservations;

    return {
      totalQuotes,
      totalAmount: totalAmount._sum.totalAmount || 0,
      quotesWithReservations,
      quotesWithoutReservations,
    };
  }

  async exportQuote(id: string): Promise<any> {
    const quote = await this.findOne(id);

    // Logique d'export (PDF, Excel, etc.)
    return {
      quote,
      exportDate: new Date(),
      format: 'json', // À adapter selon vos besoins
    };
  }

  private calculateTotalAmount(items: any[]): number {
    if (!Array.isArray(items)) return 0;

    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return total + quantity * price;
    }, 0);
  }
}
