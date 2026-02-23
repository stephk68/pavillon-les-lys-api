import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // ============================================================================
  // CORS CONFIGURATION - BLINDÉ POUR BACK OFFICE ET FRONT OFFICE
  // ============================================================================
  const allowedOrigins = [
    "http://localhost:3001", // Back Office (Dev)
    "http://localhost:3002", // Front Office (Dev)
    process.env.BACKOFFICE_URL, // Back Office (Prod)
    process.env.FRONTOFFICE_URL, // Front Office (Prod)
  ].filter(Boolean);

  logger.log(`🔒 CORS Whitelist: ${allowedOrigins.join(", ")}`);

  app.enableCors({
    origin: (origin, callback) => {
      // ✅ Accepter les requêtes sans origin (Postman, mobile apps, curl, etc.)
      if (!origin) {
        logger.debug("✅ Requête sans origin (acceptée)");
        return callback(null, true);
      }

      // ✅ En DEV : Accepter TOUS les localhost
      if (
        process.env.NODE_ENV === "development" &&
        origin.includes("localhost")
      ) {
        logger.debug(`✅ DEV Mode - Origin localhost acceptée: ${origin}`);
        return callback(null, true);
      }

      // ✅ Vérifier la whitelist EXACTE
      if (allowedOrigins.includes(origin)) {
        logger.debug(`✅ Origin whitelistée: ${origin}`);
        return callback(null, true);
      }

      // ❌ Bloquer toutes les autres origines
      logger.warn(`❌ CORS BLOQUÉ - Origin non autorisée: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 3600, // Cache preflight 1h
  });

  // Global validation pipe — enforces class-validator DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`🚀 API démarrée sur le port ${port}`);
  logger.log(`📋 Origines autorisées: ${allowedOrigins.join(", ")}`);
}
bootstrap();
