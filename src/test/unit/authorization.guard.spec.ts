import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';

describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AuthorizationGuard>(AuthorizationGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const requiredRoles = [Role.ADMIN];
      const user = { id: 'user-1', role: Role.ADMIN };

      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const requiredRoles = [Role.ADMIN, Role.EVENT_MANAGER];
      const user = { id: 'user-1', role: Role.EVENT_MANAGER };

      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const requiredRoles = [Role.ADMIN];

      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Utilisateur non authentifié',
      );
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      const requiredRoles = [Role.ADMIN];
      const user = { id: 'user-1', role: Role.CLIENT };

      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Accès refusé. Rôles requis: ADMIN',
      );
    });

    it('should throw ForbiddenException when user does not have any of multiple required roles', () => {
      const requiredRoles = [Role.ADMIN, Role.EVENT_MANAGER];
      const user = { id: 'user-1', role: Role.CLIENT };

      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Accès refusé. Rôles requis: ADMIN, EVENT_MANAGER',
      );
    });

    it('should check roles from both handler and class', () => {
      const requiredRoles = [Role.ADMIN];
      const user = { id: 'user-1', role: Role.ADMIN };

      mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockExecutionContext(user);

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});
