import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailService } from "../services/email/email.service";

/**
 * Secret de signature JWT. Plus aucune valeur par défaut : sans secret,
 * n'importe qui pourrait forger un token ADMIN. L'API refuse de démarrer.
 * JWT_ACCESS_SECRET est accepté en repli (nom utilisé dans certains .env).
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET manquant ou trop court (32 caractères minimum). " +
        "Définissez-le dans l'environnement avant de démarrer l'API.",
    );
  }
  return secret;
}

@Global()
@Module({
  imports: [
    // registerAsync : la factory s'exécute après le chargement du .env
    // par ConfigModule.forRoot (contrairement à register, évalué à l'import).
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: resolveJwtSecret(),
        signOptions: { expiresIn: "24h" },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [JwtModule, EmailService],
})
export class GlobalJwtModule {}
