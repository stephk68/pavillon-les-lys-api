import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from '../../resources/user/user.service';
import { ROLES_KEY } from '../decorators/permission.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Token d'accès requis");
    }

    try {
      const payload = this.jwtService.verify(token);

      // Vérifier que l'utilisateur existe toujours
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      // Ajouter les informations de l'utilisateur à la requête
      request['user'] = user;
    } catch (error) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
