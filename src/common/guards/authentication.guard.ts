import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { UserService } from "../../resources/user/user.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug("✅ Route publique - Authentification ignorée");
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const route = `${request.method} ${request.url}`;

    this.logger.debug(`🔒 Vérification authentification pour: ${route}`);

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn(`❌ Token manquant pour: ${route}`);
      this.logger.debug(`Headers reçus: ${JSON.stringify(request.headers)}`);
      throw new UnauthorizedException("Token d'accès requis");
    }

    try {
      const payload = this.jwtService.verify(token);
      this.logger.debug(
        `✅ Token valide - User ID: ${payload.sub}, Email: ${payload.email}`
      );

      // Vérifier que l'utilisateur existe toujours
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        this.logger.warn(`❌ Utilisateur introuvable: ${payload.sub}`);
        throw new UnauthorizedException("Utilisateur non trouvé");
      }

      this.logger.debug(
        `✅ Utilisateur trouvé: ${user.email} (Role: ${user.role})`
      );

      // Ajouter les informations de l'utilisateur à la requête
      request["user"] = user;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        this.logger.warn(`⏰ Token expiré pour: ${route}`);
        throw new UnauthorizedException("Token expiré");
      }
      if (error.name === "JsonWebTokenError") {
        this.logger.warn(`🔐 Token invalide (signature) pour: ${route}`);
        throw new UnauthorizedException("Token invalide");
      }
      this.logger.error(`❌ Erreur JWT: ${error.message}`);
      throw new UnauthorizedException("Token invalide ou expiré");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      this.logger.debug("❌ Header Authorization absent");
      return undefined;
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer") {
      this.logger.warn(
        `❌ Type d'authentification incorrect: ${type} (attendu: Bearer)`
      );
      return undefined;
    }

    this.logger.debug(`✅ Token extrait (longueur: ${token?.length || 0})`);
    return token;
  }
}
