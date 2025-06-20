import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { UserService } from '../../resources/user/user.service';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;
  let jwtService: JwtService;
  let userService: UserService;
  let reflector: Reflector;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockUserService = {
    findOne: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AuthenticationGuard>(AuthenticationGuard);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    authorization?: string,
  ): ExecutionContext => {
    const mockRequest = {
      headers: {
        authorization,
      },
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(true); // isPublic = true
      const context = createMockExecutionContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should allow access with valid token', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockPayload = { sub: 'user-1', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findOne.mockResolvedValue(mockUser);

      const context = createMockExecutionContext('Bearer valid-token');

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockUserService.findOne).toHaveBeenCalledWith('user-1');
      expect(context.switchToHttp().getRequest()['user']).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const context = createMockExecutionContext('Bearer invalid-token');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-token');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      const mockPayload = { sub: 'user-1', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findOne.mockResolvedValue(null);

      const context = createMockExecutionContext('Bearer valid-token');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.findOne).toHaveBeenCalledWith('user-1');
    });

    it('should handle malformed authorization header', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      const context = createMockExecutionContext('InvalidHeader');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should handle missing Bearer prefix', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      const context = createMockExecutionContext('token-without-bearer');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });
  });
});
