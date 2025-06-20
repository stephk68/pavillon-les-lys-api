import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventType, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationService } from '../../resources/reservation/reservation.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockReservation = {
    id: 'reservation-1',
    eventType: EventType.MARIAGE,
    start: new Date('2025-06-20T10:00:00Z'),
    end: new Date('2025-06-20T18:00:00Z'),
    attendees: 100,
    status: ReservationStatus.PENDING,
    userId: 'user-1',
    notes: 'Test reservation',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createReservationDto = {
      eventType: EventType.MARIAGE,
      start: new Date('2025-06-20T10:00:00Z'),
      end: new Date('2025-06-20T18:00:00Z'),
      attendees: 100,
      notes: 'Test reservation',
    };

    const userId = 'user-1';

    it('should create a reservation successfully', async () => {
      // Arrange
      mockPrismaService.reservation.findFirst.mockResolvedValue(null); // No conflicts
      mockPrismaService.reservation.create.mockResolvedValue(mockReservation);

      // Act
      const result = await service.create(createReservationDto, userId);

      // Assert
      expect(mockPrismaService.reservation.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [
            { start: { lt: createReservationDto.end } },
            { end: { gt: createReservationDto.start } },
            {
              status: {
                in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
              },
            },
          ],
        },
      });
      expect(mockPrismaService.reservation.create).toHaveBeenCalledWith({
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
      expect(result).toEqual(mockReservation);
    });

    it('should throw BadRequestException if start date is in the past', async () => {
      // Arrange
      const pastDto = {
        ...createReservationDto,
        start: new Date('2020-01-01T10:00:00Z'),
      };

      // Act & Assert
      await expect(service.create(pastDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.reservation.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      // Arrange
      const invalidDto = {
        ...createReservationDto,
        start: new Date('2025-06-20T18:00:00Z'),
        end: new Date('2025-06-20T10:00:00Z'),
      };

      // Act & Assert
      await expect(service.create(invalidDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.reservation.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if time slot is not available', async () => {
      // Arrange
      const conflictingReservation = { id: 'conflict-1' };
      mockPrismaService.reservation.findFirst.mockResolvedValue(
        conflictingReservation,
      );

      // Act & Assert
      await expect(
        service.create(createReservationDto, userId),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a reservation by id', async () => {
      // Arrange
      const reservationWithPayments = {
        ...mockReservation,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        reservationWithPayments,
      );

      // Act
      const result = await service.findOne('reservation-1');

      // Assert
      expect(mockPrismaService.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
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
      expect(result).toEqual(reservationWithPayments);
    });

    it('should throw NotFoundException if reservation not found', async () => {
      // Arrange
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkAvailability', () => {
    const start = new Date('2025-06-20T10:00:00Z');
    const end = new Date('2025-06-20T18:00:00Z');

    it('should return true if slot is available', async () => {
      // Arrange
      mockPrismaService.reservation.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.checkAvailability(start, end);

      // Assert
      expect(mockPrismaService.reservation.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [
            { start: { lt: end } },
            { end: { gt: start } },
            {
              status: {
                in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
              },
            },
          ],
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if slot is not available', async () => {
      // Arrange
      mockPrismaService.reservation.findFirst.mockResolvedValue(
        mockReservation,
      );

      // Act
      const result = await service.checkAvailability(start, end);

      // Assert
      expect(result).toBe(false);
    });

    it('should exclude specific reservation when checking availability', async () => {
      // Arrange
      const excludeId = 'exclude-1';
      mockPrismaService.reservation.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.checkAvailability(start, end, excludeId);

      // Assert
      expect(mockPrismaService.reservation.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [
            { start: { lt: end } },
            { end: { gt: start } },
            {
              status: {
                in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
              },
            },
            { id: { not: excludeId } },
          ],
        },
      });
      expect(result).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update reservation status', async () => {
      // Arrange
      const reservationWithPayments = {
        ...mockReservation,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        reservationWithPayments,
      );
      const updatedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      };
      mockPrismaService.reservation.update.mockResolvedValue(
        updatedReservation,
      );

      // Act
      const result = await service.updateStatus(
        'reservation-1',
        ReservationStatus.CONFIRMED,
      );

      // Assert
      expect(mockPrismaService.reservation.update).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
        data: { status: ReservationStatus.CONFIRMED },
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
      expect(result).toEqual(updatedReservation);
    });
  });

  describe('cancel', () => {
    it('should cancel reservation successfully', async () => {
      // Arrange
      const reservationWithPayments = {
        ...mockReservation,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        reservationWithPayments,
      );
      const cancelledReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELED,
      };
      mockPrismaService.reservation.update.mockResolvedValue(
        cancelledReservation,
      );

      // Act
      const result = await service.cancel('reservation-1');

      // Assert
      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('should throw BadRequestException if reservation is already cancelled', async () => {
      // Arrange
      const cancelledReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELED,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        cancelledReservation,
      );

      // Act & Assert
      await expect(service.cancel('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if reservation is completed', async () => {
      // Arrange
      const completedReservation = {
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        completedReservation,
      );

      // Act & Assert
      await expect(service.cancel('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should check user ownership when userId is provided', async () => {
      // Arrange
      const reservationWithPayments = {
        ...mockReservation,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        reservationWithPayments,
      );

      // Act & Assert
      await expect(
        service.cancel('reservation-1', 'different-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('should confirm a pending reservation', async () => {
      // Arrange
      const pendingReservation = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        pendingReservation,
      );
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      };
      mockPrismaService.reservation.update.mockResolvedValue(
        confirmedReservation,
      );

      // Act
      const result = await service.confirm('reservation-1');

      // Assert
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
    });

    it('should throw BadRequestException if reservation is not pending', async () => {
      // Arrange
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        confirmedReservation,
      );

      // Act & Assert
      await expect(service.confirm('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete a confirmed reservation after end date', async () => {
      // Arrange
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
        end: new Date('2020-01-01T18:00:00Z'), // Past date
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        confirmedReservation,
      );
      const completedReservation = {
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
      };
      mockPrismaService.reservation.update.mockResolvedValue(
        completedReservation,
      );

      // Act
      const result = await service.complete('reservation-1');

      // Assert
      expect(result.status).toBe(ReservationStatus.COMPLETED);
    });

    it('should throw BadRequestException if reservation is not confirmed', async () => {
      // Arrange
      const pendingReservation = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        pendingReservation,
      );

      // Act & Assert
      await expect(service.complete('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if reservation end date has not passed', async () => {
      // Arrange
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
        end: new Date('2030-01-01T18:00:00Z'), // Future date
        payments: [],
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        confirmedReservation,
      );

      // Act & Assert
      await expect(service.complete('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
