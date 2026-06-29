import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { Request } from "express";
import { ROLES_KEY } from "../decorators/permission.decorator";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const route = `${request.method} ${request.url}`;

    if (!requiredRoles) {
      this.logger.debug(`✅ Pas de rôles requis pour: ${route}`);
      return true;
    }

    this.logger.debug(`🔐 Vérification des rôles pour: ${route}`);
    this.logger.debug(`Rôles requis: [${requiredRoles.join(", ")}]`);

    const user = request["user"] as any;

    if (!user) {
      this.logger.warn(`❌ Utilisateur non trouvé dans request pour: ${route}`);
      throw new ForbiddenException("Utilisateur non authentifié");
    }

    this.logger.debug(`Utilisateur: ${user.email} (Role: ${user.role})`);

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `❌ Accès refusé pour ${user.email} (${user.role}) sur ${route}. Rôles requis: [${requiredRoles.join(", ")}]`
      );
      throw new ForbiddenException(
        `Accès refusé. Rôles requis: ${requiredRoles.join(", ")}. Votre rôle: ${user.role}`
      );
    }

    this.logger.debug(`✅ Accès autorisé pour ${user.email} (${user.role})`);
    return true;
  }
}
