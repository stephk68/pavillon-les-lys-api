import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OwnerOrAdminGuard } from '../../common/guards/owner.guard';

describe('OwnerOrAdminGuard', () => {
  let guard: OwnerOrAdminGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OwnerOrAdminGuard],
    }).compile();

    guard = module.get<OwnerOrAdminGuard>(OwnerOrAdminGuard);
  });

  const createMockExecutionContext = (
    user: any,
    targetUserId: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: { id: targetUserId },
        }),
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when user is admin', () => {
      const user = { id: 'user-1', role: 'ADMIN' };
      const targetUserId = 'user-2';

      const context = createMockExecutionContext(user, targetUserId);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user is accessing their own data', () => {
      const user = { id: 'user-1', role: 'CLIENT' };
      const targetUserId = 'user-1';

      const context = createMockExecutionContext(user, targetUserId);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user is admin and accessing their own data', () => {
      const user = { id: 'user-1', role: 'ADMIN' };
      const targetUserId = 'user-1';

      const context = createMockExecutionContext(user, targetUserId);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when non-admin user tries to access other user data', () => {
      const user = { id: 'user-1', role: 'CLIENT' };
      const targetUserId = 'user-2';

      const context = createMockExecutionContext(user, targetUserId);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "Vous ne pouvez accéder qu'à vos propres données",
      );
    });

    it('should throw ForbiddenException when event manager tries to access other user data', () => {
      const user = { id: 'user-1', role: 'EVENT_MANAGER' };
      const targetUserId = 'user-2';

      const context = createMockExecutionContext(user, targetUserId);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "Vous ne pouvez accéder qu'à vos propres données",
      );
    });
  });
});
