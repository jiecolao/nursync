import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontend = process.env.FRONTEND_PORT ?? 5173;
  const backend = process.env.BACKEND_PORT ?? 5151;

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Authenticated/API responses must never be stored by browsers or shared caches.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  app.getHttpAdapter().getInstance().use(
    '/admin-profile-pictures',
    express.static(path.resolve(process.env.ADMIN_PROFILE_PIC_PATH || './Database/Admin/Pictures')),
  );

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? `http://localhost:${frontend}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(backend);
  console.log(`ReactJS API running on http://localhost:${frontend}`);
  console.log(`NestJS API running on http://localhost:${backend}`);
}
bootstrap();
