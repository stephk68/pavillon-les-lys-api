import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/services/prisma.service';
import { AuthService } from '../../resources/auth/auth.service';
import { UserService } from '../../resources/user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let userService: UserService;
  let jwtService: JwtService;

  // Mock des services
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    validatePassword: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: 'CLIENT',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should login successfully with valid credentials', async () => {
      // Arrange
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUserService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        access_token: 'jwt-token',
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockUserService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUserService.validatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    const mockCreatedUser = {
      id: 'user-2',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'CLIENT',
    };

    it('should register successfully when user does not exist', async () => {
      // Arrange
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockCreatedUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.create).toHaveBeenCalledWith(registerDto);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockCreatedUser.id,
        email: mockCreatedUser.email,
        role: mockCreatedUser.role,
      });
      expect(result).toEqual({
        user: mockCreatedUser,
        access_token: 'jwt-token',
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      const existingUser = { id: 'existing-user', email: registerDto.email };
      mockUserService.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const userId = 'user-1';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      role: 'CLIENT',
    };

    it('should refresh token successfully', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      const result = await service.refreshToken(userId);

      // Assert
      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        access_token: 'new-jwt-token',
      });
    });
  });
});
