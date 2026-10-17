import 'dotenv/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './integrations/prisma/prisma.filter';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontend = process.env.FRONTEND_PORT ?? 5173
  const backend = process.env.BACKEND_PORT ?? 5151

  // Filter HTTP
  // const { httpAdapter } = app.get(HttpAdapterHost);
  // app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  app.setGlobalPrefix('api');
  app.use(cookieParser())

  app.enableCors({
    origin: `http://localhost:${process.env.FRONTEND_PORT}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true 
  }));

  await app.listen(backend);
  
  console.log(`ReactJS API running on http://localhost:${frontend}`);
  console.log(`NestJS API running on http://localhost:${backend}`);
}
bootstrap();
