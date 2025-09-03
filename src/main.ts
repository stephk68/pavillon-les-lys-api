import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration CORS - Autorise toutes les origines
  app.enableCors({
    origin: true, // Autorise toutes les origines
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    credentials: true, // Permet l'envoi de cookies/tokens
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
