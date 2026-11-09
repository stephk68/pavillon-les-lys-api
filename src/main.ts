import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière nginx, l'IP vue par l'API est celle du proxy : sans « trust proxy »,
  // tous les visiteurs partageraient le même quota du rate limiting.
  // TRUST_PROXY = nombre de proxys de confiance devant l'API (ex. 1).
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
  }

  // CORS : liste blanche dès que les URL des fronts sont configurées.
  const allowedOrigins = [
    process.env.BACKOFFICE_URL,
    process.env.FRONTOFFICE_URL,
    ...(process.env.CORS_EXTRA_ORIGINS?.split(",") ?? []),
    ...(process.env.NODE_ENV !== "production"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
        ]
      : []),
  ]
    .map((o) => o?.trim())
    .filter((o): o is string => !!o);

  const corsOrigin =
    process.env.BACKOFFICE_URL || process.env.FRONTOFFICE_URL
      ? allowedOrigins
      : true;
  logger.log(
    corsOrigin === true
      ? "⚠️ CORS: aucune URL de front configurée — toutes origines autorisées"
      : `🔒 CORS: ${allowedOrigins.join(", ")}`,
  );

  app.enableCors({
    origin: corsOrigin,
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
}
bootstrap();
