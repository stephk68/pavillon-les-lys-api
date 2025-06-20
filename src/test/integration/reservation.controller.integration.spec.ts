import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { EventType, ReservationStatus, Role } from '@prisma/client';
import * as request from 'supertest';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationModule } from '../../resources/reservation/reservation.module';

describe('ReservationController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockPrismaService = {
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ReservationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(JwtService)
      .useValue(mockJwtService)
      .overrideGuard(AuthenticationGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .overrideGuard(AuthorizationGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /reservations', () => {
    it('should create a new reservation', async () => {
      const createReservationDto = {
        userId: 'user-1',
        eventType: EventType.MARIAGE,
        start: '2024-12-25T10:00:00Z',
        end: '2024-12-25T23:00:00Z',
        attendees: 150,
      };

      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        role: Role.CLIENT,
      };

      const mockReservation = {
        id: 'reservation-1',
        userId: 'user-1',
        eventType: EventType.MARIAGE,
        start: new Date('2024-12-25T10:00:00Z'),
        end: new Date('2024-12-25T23:00:00Z'),
        attendees: 150,
        status: ReservationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.create.mockResolvedValue(mockReservation);

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .send(createReservationDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'reservation-1',
        userId: 'user-1',
        eventType: 'MARIAGE',
        attendees: 150,
        status: 'PENDING',
      });
    });

    it('should return 400 if user does not exist', async () => {
      const createReservationDto = {
        userId: 'non-existent',
        eventType: EventType.MARIAGE,
        start: '2024-12-25T10:00:00Z',
        end: '2024-12-25T23:00:00Z',
        attendees: 150,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/reservations')
        .send(createReservationDto)
        .expect(400);
    });
  });

  describe('GET /reservations', () => {
    it('should return all reservations', async () => {
      const mockReservations = [
        {
          id: 'reservation-1',
          userId: 'user-1',
          eventType: EventType.MARIAGE,
          start: new Date('2024-12-25T10:00:00Z'),
          end: new Date('2024-12-25T23:00:00Z'),
          attendees: 150,
          status: ReservationStatus.PENDING,
          user: {
            id: 'user-1',
            email: 'user@test.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      const response = await request(app.getHttpServer())
        .get('/reservations')
        .expect(200);

      expect(response.body).toEqual(mockReservations);
    });

    it('should filter reservations by status', async () => {
      const mockReservations = [
        {
          id: 'reservation-1',
          status: ReservationStatus.CONFIRMED,
        },
      ];

      mockPrismaService.reservation.findMany.mockResolvedValue(
        mockReservations,
      );

      await request(app.getHttpServer())
        .get('/reservations?status=CONFIRMED')
        .expect(200);

      expect(mockPrismaService.reservation.findMany).toHaveBeenCalledWith({
        where: { status: 'CONFIRMED' },
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
          quote: true,
          payments: true,
          checklist: true,
        },
        orderBy: { start: 'asc' },
      });
    });
  });

  describe('GET /reservations/:id', () => {
    it('should return a reservation by id', async () => {
      const mockReservation = {
        id: 'reservation-1',
        userId: 'user-1',
        eventType: EventType.MARIAGE,
        status: ReservationStatus.PENDING,
        user: {
          id: 'user-1',
          email: 'user@test.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );

      const response = await request(app.getHttpServer())
        .get('/reservations/reservation-1')
        .expect(200);

      expect(response.body).toEqual(mockReservation);
    });

    it('should return 404 if reservation not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/reservations/non-existent')
        .expect(404);
    });
  });

  describe('PATCH /reservations/:id/confirm', () => {
    it('should confirm a reservation', async () => {
      const mockReservation = {
        id: 'reservation-1',
        status: ReservationStatus.PENDING,
      };

      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.reservation.update.mockResolvedValue(
        confirmedReservation,
      );

      const response = await request(app.getHttpServer())
        .patch('/reservations/reservation-1/confirm')
        .expect(200);

      expect(response.body.status).toBe('CONFIRMED');
    });
  });

  describe('PATCH /reservations/:id/cancel', () => {
    it('should cancel a reservation', async () => {
      const mockReservation = {
        id: 'reservation-1',
        status: ReservationStatus.PENDING,
      };

      const canceledReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELED,
      };

      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.reservation.update.mockResolvedValue(
        canceledReservation,
      );

      const response = await request(app.getHttpServer())
        .patch('/reservations/reservation-1/cancel')
        .expect(200);

      expect(response.body.status).toBe('CANCELED');
    });
  });

  describe('GET /reservations/check-availability', () => {
    it('should check availability for a date range', async () => {
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/reservations/check-availability')
        .query({
          start: '2024-12-25T10:00:00Z',
          end: '2024-12-25T23:00:00Z',
        })
        .expect(200);

      expect(response.body).toEqual({
        available: true,
        conflicts: [],
      });
    });

    it('should return conflicts if dates are not available', async () => {
      const conflictingReservation = {
        id: 'reservation-1',
        start: new Date('2024-12-25T12:00:00Z'),
        end: new Date('2024-12-25T22:00:00Z'),
        status: ReservationStatus.CONFIRMED,
      };

      mockPrismaService.reservation.findMany.mockResolvedValue([
        conflictingReservation,
      ]);

      const response = await request(app.getHttpServer())
        .get('/reservations/check-availability')
        .query({
          start: '2024-12-25T10:00:00Z',
          end: '2024-12-25T23:00:00Z',
        })
        .expect(200);

      expect(response.body).toEqual({
        available: false,
        conflicts: [conflictingReservation],
      });
    });
  });
});
