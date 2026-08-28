import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security ──────────────────────────────────────────────────
  app.use((helmet as any).default());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // ── Global API Prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Global Pipes ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // auto-transform to DTO class instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Filters & Interceptors ─────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger ───────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('CourtHub API')
    .setDescription(
      'Sports Court Booking System — REST API documentation.\n\n' +
      'Use the **Authorize** button to set your Bearer JWT token.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & authorization endpoints')
    .addTag('Users', 'User profile management')
    .addTag('Venues', 'Venue creation and management')
    .addTag('Courts', 'Court listing, search, and availability')
    .addTag('Bookings', 'Court booking flow')
    .addTag('Payments', 'Mock payment confirmation')
    .addTag('Admin', 'Platform-wide admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ── Start ─────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀  CourtHub API running on http://localhost:${port}/api/v1`);
  console.log(`📚  Swagger docs at  http://localhost:${port}/api/docs`);
}

bootstrap();
