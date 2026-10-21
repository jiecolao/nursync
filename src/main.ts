import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontend = process.env.FRONTEND_PORT ?? 5173;
  const backend = process.env.BACKEND_PORT ?? 5151;

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Authentication and session responses must never be reused from browser or
  // intermediary caches after logout or session expiration.
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? `http://localhost:${frontend}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  await app.listen(backend);

  console.log(`ReactJS API running on http://localhost:${frontend}`);
  console.log(`NestJS API running on http://localhost:${backend}`);
}
bootstrap();
