import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { UserService } from '../../resources/user/user.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    role: Role.CLIENT,
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithoutPassword = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    role: Role.CLIENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      reservation: {
        findMany: jest.fn(),
      },
      payment: {
        aggregate: jest.fn(),
      },
    };

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
    prismaService = module.get(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      role: Role.CLIENT,
    };

    it('should create a user successfully', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      prismaService.user.create.mockResolvedValue(mockUserWithoutPassword);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        10,
      );
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDto,
          password: 'hashedPassword',
          role: Role.CLIENT,
        },
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
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all users with default options', async () => {
      // Arrange
      const mockUsers = [mockUserWithoutPassword];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: undefined,
        skip: 0,
        take: 50,
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
      expect(result).toEqual(mockUsers);
    });

    it('should filter users by role', async () => {
      // Arrange
      const mockUsers = [mockUserWithoutPassword];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAll({ role: Role.ADMIN });

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.ADMIN },
        skip: 0,
        take: 50,
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
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      // Arrange
      const mockUserWithReservations = {
        ...mockUserWithoutPassword,
        reservations: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithReservations);

      // Act
      const result = await service.findOne('user-1');

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          reservations: {
            select: {
              id: true,
              eventType: true,
              start: true,
              end: true,
              status: true,
              attendees: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(result).toEqual(mockUserWithReservations);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update a user successfully', async () => {
      // Arrange
      const mockUserWithReservations = {
        ...mockUserWithoutPassword,
        reservations: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithReservations);
      const updatedUser = { ...mockUserWithoutPassword, ...updateUserDto };
      prismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update('user-1', updateUserDto);

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateUserDto,
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
      });
      expect(result).toEqual(updatedUser);
    });

    it('should check for email conflicts when updating email', async () => {
      // Arrange
      const updateWithEmail = { email: 'newemail@example.com' };
      const mockUserWithReservations = {
        ...mockUserWithoutPassword,
        reservations: [],
      };
      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUserWithReservations) // findOne call
        .mockResolvedValueOnce(null); // email conflict check
      prismaService.user.update.mockResolvedValue({
        ...mockUserWithoutPassword,
        ...updateWithEmail,
      });

      // Act
      const result = await service.update('user-1', updateWithEmail);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: updateWithEmail.email },
      });
      expect(result.email).toBe(updateWithEmail.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      const updateWithEmail = { email: 'existing@example.com' };
      const mockUserWithReservations = {
        ...mockUserWithoutPassword,
        reservations: [],
      };
      const existingUser = { ...mockUser, id: 'different-user-id' };

      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUserWithReservations) // findOne call
        .mockResolvedValueOnce(existingUser); // email conflict check

      // Act & Assert
      await expect(service.update('user-1', updateWithEmail)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword');
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });

      // Act
      await service.updatePassword('user-1', 'currentPassword', 'newPassword');

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'currentPassword',
        mockUser.password,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'newHashedPassword' },
      });
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.updatePassword('user-1', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove user successfully when no active reservations', async () => {
      // Arrange
      const mockUserWithReservations = {
        ...mockUserWithoutPassword,
        reservations: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithReservations);
      prismaService.reservation.findMany.mockResolvedValue([]);
      prismaService.user.delete.mockResolvedValue(mockUser);

      // Act
      await service.remove('user-1');

      // Assert
      expect(prismaService.reservation.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw BadRequestException if user has active reservations', async () => {
      // Arrange
      const mockUserWithReservations = {
        ...mockUserWithoutPassword,
        reservations: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithReservations);
      prismaService.reservation.findMany.mockResolvedValue([
        { id: 'reservation-1', status: 'CONFIRMED' },
      ]);

      // Act & Assert
      await expect(service.remove('user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should validate password correctly', async () => {
      // Arrange
      mockedBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await service.validatePassword(
        'plainPassword',
        'hashedPassword',
      );

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'plainPassword',
        'hashedPassword',
      );
      expect(result).toBe(true);
    });
  });

  describe('countUsers', () => {
    it('should return user count', async () => {
      // Arrange
      prismaService.user.count.mockResolvedValue(10);

      // Act
      const result = await service.countUsers();

      // Assert
      expect(prismaService.user.count).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      // Arrange
      const mockUsers = [mockUserWithoutPassword];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.searchUsers('john');

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        },
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
        take: 20,
      });
      expect(result).toEqual(mockUsers);
    });
  });
});
