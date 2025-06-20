import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateQuoteDto } from '../../resources/quote/dto/create-quote.dto';
import { UpdateQuoteDto } from '../../resources/quote/dto/update-quote.dto';
import { QuoteService } from '../../resources/quote/quote.service';
import { ReservationService } from '../../resources/reservation/reservation.service';

describe('QuoteService', () => {
  let service: QuoteService;
  let prismaService: PrismaService;
  let reservationService: ReservationService;

  // Mock des services
  const mockPrismaService = {
    quote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    reservation: {
      update: jest.fn(),
    },
  };

  const mockReservationService = {
    findOne: jest.fn(),
  };

  const mockQuote = {
    id: 'quote-1',
    items: [
      { name: 'Location salle', price: 500000, quantity: 1 },
      { name: 'Décoration', price: 200000, quantity: 1 },
    ],
    totalAmount: 700000,
    currency: 'XOF',
    createdAt: new Date(),
    reservation: null,
  };

  const mockReservation = {
    id: 'reservation-1',
    userId: 'user-1',
    eventType: 'MARIAGE',
    start: new Date(),
    end: new Date(),
    attendees: 100,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
      ],
    }).compile();

    service = module.get<QuoteService>(QuoteService);
    prismaService = module.get(PrismaService);
    reservationService = module.get(ReservationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createQuoteDto: CreateQuoteDto = {
      items: [
        { name: 'Location salle', price: 500000, quantity: 1 },
        { name: 'Décoration', price: 200000, quantity: 1 },
      ],
      reservationId: 'reservation-1',
    };

    it('should create a quote successfully', async () => {
      mockReservationService.findOne.mockResolvedValue(mockReservation);
      mockPrismaService.quote.findFirst.mockResolvedValue(null);
      mockPrismaService.quote.create.mockResolvedValue(mockQuote);
      mockPrismaService.reservation.update.mockResolvedValue(mockReservation);

      const result = await service.create(createQuoteDto);

      expect(mockReservationService.findOne).toHaveBeenCalledWith(
        'reservation-1',
      );
      expect(mockPrismaService.quote.create).toHaveBeenCalledWith({
        data: {
          ...createQuoteDto,
          totalAmount: 700000,
        },
      });
      expect(result).toEqual(mockQuote);
    });

    it('should create a quote without reservation', async () => {
      const createQuoteDtoWithoutReservation = {
        items: [{ name: 'Location salle', price: 500000, quantity: 1 }],
      };

      mockPrismaService.quote.create.mockResolvedValue(mockQuote);

      const result = await service.create(createQuoteDtoWithoutReservation);

      expect(mockReservationService.findOne).not.toHaveBeenCalled();
      expect(mockPrismaService.quote.create).toHaveBeenCalled();
      expect(result).toEqual(mockQuote);
    });

    it('should throw BadRequestException if quote already exists for reservation', async () => {
      mockReservationService.findOne.mockResolvedValue(mockReservation);
      mockPrismaService.quote.findFirst.mockResolvedValue(mockQuote);

      await expect(service.create(createQuoteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all quotes', async () => {
      const mockQuotes = [mockQuote, { ...mockQuote, id: 'quote-2' }];
      mockPrismaService.quote.findMany.mockResolvedValue(mockQuotes);

      const result = await service.findAll();

      expect(mockPrismaService.quote.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockQuotes);
    });
  });

  describe('findOne', () => {
    it('should return a quote by id', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);

      const result = await service.findOne('quote-1');

      expect(mockPrismaService.quote.findUnique).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
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
      expect(result).toEqual(mockQuote);
    });

    it('should throw NotFoundException if quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateQuoteDto: UpdateQuoteDto = {
      items: [{ name: 'Location salle', price: 600000, quantity: 1 }],
    };

    it('should update a quote successfully', async () => {
      const updatedQuote = { ...mockQuote, totalAmount: 600000 };
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrismaService.quote.update.mockResolvedValue(updatedQuote);

      const result = await service.update('quote-1', updateQuoteDto);

      expect(mockPrismaService.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: {
          ...updateQuoteDto,
          totalAmount: 600000,
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
      expect(result).toEqual(updatedQuote);
    });
  });

  describe('remove', () => {
    it('should remove a quote successfully', async () => {
      const quoteWithReservation = {
        ...mockQuote,
        reservation: mockReservation,
      };
      mockPrismaService.quote.findUnique.mockResolvedValue(
        quoteWithReservation,
      );
      mockPrismaService.reservation.update.mockResolvedValue(mockReservation);
      mockPrismaService.quote.delete.mockResolvedValue(mockQuote);

      await service.remove('quote-1');

      expect(mockPrismaService.quote.delete).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
      });
    });
  });

  describe('addItem', () => {
    it('should add an item to a quote', async () => {
      const newItem = { name: 'Traiteur', price: 300000, quantity: 1 };
      const updatedQuote = {
        ...mockQuote,
        items: [...mockQuote.items, newItem],
        totalAmount: 1000000,
      };

      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrismaService.quote.update.mockResolvedValue(updatedQuote);

      const result = await service.addItem('quote-1', newItem);

      expect(mockPrismaService.quote.update).toHaveBeenCalled();
      expect(result).toEqual(updatedQuote);
    });
  });

  describe('getQuoteStats', () => {
    it('should return quote statistics', async () => {
      const mockStats = {
        totalQuotes: 10,
        totalAmount: 5000000,
        quotesWithReservations: 8,
        quotesWithoutReservations: 2,
      };

      mockPrismaService.quote.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      mockPrismaService.quote.aggregate.mockResolvedValue({
        _sum: { totalAmount: 5000000 },
      });

      const result = await service.getQuoteStats();

      expect(result).toEqual(mockStats);
    });
  });
});
