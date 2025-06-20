import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { UserService } from '../../resources/user/user.service';
import { clearAllMocks, mockPrismaService } from '../mocks/prisma.mock';

describe('UserService - Basic Tests', () => {
  let service: UserService;
  let prismaService: any;

  beforeEach(async () => {
    clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prismaService).toBeDefined();
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockCreatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: null,
        role: Role.CLIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock des appels Prisma
      prismaService.user.findUnique.mockResolvedValue(null); // Aucun utilisateur existant
      prismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register(createUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      const existingUser = {
        id: 'existing-user',
        email: 'existing@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      // Mock utilisateur existant
      prismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.CLIENT,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const email = 'notfound@example.com';

      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });
});
