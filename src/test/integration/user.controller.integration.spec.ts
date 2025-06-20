import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { PrismaService } from '../../common/services/prisma.service';
import { UserModule } from '../../resources/user/user.module';

describe('UserController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
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
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /users/client', () => {
    it('should create a new client', async () => {
      const createUserDto = {
        email: 'client@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+225123456789',
      };

      const mockUser = {
        id: 'user-1',
        ...createUserDto,
        role: Role.CLIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/users/client')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'user-1',
        email: 'client@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT',
      });
      expect(response.body.password).toBeUndefined();
    });
  });

  describe('POST /users/staff', () => {
    it('should create a new staff member', async () => {
      const createUserDto = {
        email: 'staff@test.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: Role.EVENT_MANAGER,
      };

      const mockUser = {
        id: 'user-2',
        ...createUserDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/users/staff')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'user-2',
        email: 'staff@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'EVENT_MANAGER',
      });
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@test.com',
          firstName: 'User',
          lastName: 'One',
          role: Role.CLIENT,
        },
        {
          id: 'user-2',
          email: 'user2@test.com',
          firstName: 'User',
          lastName: 'Two',
          role: Role.EVENT_MANAGER,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter users by role', async () => {
      const mockClients = [
        {
          id: 'user-1',
          email: 'client@test.com',
          firstName: 'Client',
          lastName: 'User',
          role: Role.CLIENT,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockClients);

      const response = await request(app.getHttpServer())
        .get('/users?role=CLIENT')
        .expect(200);

      expect(response.body).toEqual(mockClients);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: 'CLIENT' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CLIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/user-1')
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/users/non-existent').expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const existingUser = {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Old',
        lastName: 'Name',
        role: Role.CLIENT,
      };

      const updatedUser = {
        ...existingUser,
        ...updateUserDto,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .patch('/users/user-1')
        .send(updateUserDto)
        .expect(200);

      expect(response.body).toMatchObject(updateUserDto);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CLIENT,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      await request(app.getHttpServer()).delete('/users/user-1').expect(200);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
