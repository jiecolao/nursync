import 'dotenv/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './integrations/prisma/prisma.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontend = process.env.FRONTEND_PORT ?? 5173
  const backend = process.env.BACKEND_PORT ?? 5151

  // Filter HTTP
  // const { httpAdapter } = app.get(HttpAdapterHost);
  // app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  app.setGlobalPrefix('api');
  app.use(cookieParser())

  await app.listen(backend);
  
  console.log(`ReactJS API running on http://localhost:${frontend}`);
  console.log(`NestJS API running on http://localhost:${backend}`);
}
bootstrap();
