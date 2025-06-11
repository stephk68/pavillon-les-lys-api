import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetUserId = request.params.id;

    // L'utilisateur peut accéder à ses propres données ou être admin
    if (user.id === targetUserId || user.role === 'ADMIN') {
      return true;
    }

    throw new ForbiddenException(
      "Vous ne pouvez accéder qu'à vos propres données",
    );
  }
}
