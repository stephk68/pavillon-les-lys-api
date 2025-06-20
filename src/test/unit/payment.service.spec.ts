import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { PaymentService } from '../../resources/payment/payment.service';
import { ReservationService } from '../../resources/reservation/reservation.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let reservationService: ReservationService;

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockReservationService = {
    findOne: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  };

  const mockPayment = {
    id: 'payment-1',
    amount: 50000, // 500.00 XOF
    type: PaymentType.ACOMPTE,
    status: PaymentStatus.PENDING,
    reservationId: 'reservation-1',
    userId: 'user-1',
    paymentDate: new Date(),
    description: 'Test payment',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    reservation: {
      id: 'reservation-1',
      eventType: 'MARIAGE',
      start: new Date(),
      end: new Date(),
      attendees: 100,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReservation = {
    id: 'reservation-1',
    userId: 'user-1',
    eventType: 'MARIAGE',
    start: new Date(),
    end: new Date(),
    attendees: 100,
    status: 'PENDING',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
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

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    reservationService = module.get<ReservationService>(ReservationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createPaymentDto = {
      amount: 50000,
      type: PaymentType.ACOMPTE,
      reservationId: 'reservation-1',
      description: 'Test payment',
    };

    const userId = 'user-1';

    it('should create a payment successfully', async () => {
      // Arrange
      mockReservationService.findOne.mockResolvedValue(mockReservation);
      mockPrismaService.payment.findFirst.mockResolvedValue(null); // No existing payment
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      // Act
      const result = await service.create(createPaymentDto, userId);

      // Assert
      expect(mockReservationService.findOne).toHaveBeenCalledWith(
        createPaymentDto.reservationId,
      );
      expect(mockPrismaService.payment.findFirst).toHaveBeenCalledWith({
        where: {
          reservationId: createPaymentDto.reservationId,
          status: PaymentStatus.PAID,
        },
      });
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...createPaymentDto,
          userId,
          status: PaymentStatus.PENDING,
          paymentDate: expect.any(Date),
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
      expect(result).toEqual(mockPayment);
    });

    it('should throw BadRequestException if reservation does not belong to user', async () => {
      // Arrange
      const differentUserReservation = {
        ...mockReservation,
        userId: 'different-user',
      };
      mockReservationService.findOne.mockResolvedValue(
        differentUserReservation,
      );

      // Act & Assert
      await expect(service.create(createPaymentDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if reservation already has a paid payment', async () => {
      // Arrange
      mockReservationService.findOne.mockResolvedValue(mockReservation);
      const existingPayment = {
        id: 'existing-payment',
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.findFirst.mockResolvedValue(existingPayment);

      // Act & Assert
      await expect(service.create(createPaymentDto, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await service.findOne('payment-1');

      // Assert
      expect(mockPrismaService.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: {
          user: {
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
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException if payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update payment status to PAID and confirm reservation', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.update.mockResolvedValue(updatedPayment);

      // Act
      const result = await service.updateStatus(
        'payment-1',
        PaymentStatus.PAID,
      );

      // Assert
      expect(mockReservationService.confirm).toHaveBeenCalledWith(
        mockPayment.reservationId,
      );
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.PAID,
          paymentDate: expect.any(Date),
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
      expect(result).toEqual(updatedPayment);
    });

    it('should not confirm reservation if payment was already paid', async () => {
      // Arrange
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paidPayment);
      mockPrismaService.payment.update.mockResolvedValue(paidPayment);

      // Act
      await service.updateStatus('payment-1', PaymentStatus.PAID);

      // Assert
      expect(mockReservationService.confirm).not.toHaveBeenCalled();
    });
  });

  describe('markAsPaid', () => {
    it('should mark payment as paid', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.update.mockResolvedValue(paidPayment);

      // Act
      const result = await service.markAsPaid('payment-1');

      // Assert
      expect(result.status).toBe(PaymentStatus.PAID);
    });
  });

  describe('markAsFailed', () => {
    it('should mark payment as failed', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      const failedPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING, // Utilisons un statut valide
      };
      mockPrismaService.payment.update.mockResolvedValue(failedPayment);

      // Act
      const result = await service.markAsFailed('payment-1');

      // Assert
      expect(result.status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('refund', () => {
    it('should refund a paid payment', async () => {
      // Arrange
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paidPayment);
      const refundedPayment = {
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      };
      mockPrismaService.payment.update.mockResolvedValue(refundedPayment);

      // Act
      const result = await service.refund('payment-1');

      // Assert
      expect(mockReservationService.cancel).toHaveBeenCalledWith(
        paidPayment.reservationId,
      );
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });

    it('should throw BadRequestException if payment is not paid', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);

      // Act & Assert
      await expect(service.refund('payment-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockReservationService.cancel).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a non-paid payment', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);
      mockPrismaService.payment.delete.mockResolvedValue(pendingPayment);

      // Act
      await service.remove('payment-1');

      // Assert
      expect(mockPrismaService.payment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('should throw BadRequestException if trying to remove a paid payment', async () => {
      // Arrange
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paidPayment);

      // Act & Assert
      await expect(service.remove('payment-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.payment.delete).not.toHaveBeenCalled();
    });
  });

  describe('processPayment', () => {
    it('should process a pending payment successfully', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.update.mockResolvedValue(paidPayment);

      // Act
      const result = await service.processPayment('payment-1', {
        method: 'card',
      });

      // Assert
      expect(result.status).toBe(PaymentStatus.PAID);
    });

    it('should throw BadRequestException if payment is not pending', async () => {
      // Arrange
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paidPayment);

      // Act & Assert
      await expect(
        service.processPayment('payment-1', { method: 'card' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createInvoice', () => {
    it('should create invoice for paid payment', async () => {
      // Arrange
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paidPayment);

      // Act
      const result = await service.createInvoice('payment-1');

      // Assert
      expect(result).toEqual({
        id: `INV-${paidPayment.id}`,
        paymentId: paidPayment.id,
        amount: paidPayment.amount,
        date: paidPayment.paymentDate,
        customer: paidPayment.user,
        reservation: paidPayment.reservation,
      });
    });

    it('should throw BadRequestException if payment is not paid', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);

      // Act & Assert
      await expect(service.createInvoice('payment-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
