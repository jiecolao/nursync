import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }

    const adapter = new PrismaMariaDb(connectionString);
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.connectWithRetry()
  }

  private async connectWithRetry(retries = 5, delayMs = 3000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.$connect();
        // Warm up the pool with a lightweight query
        await this.$queryRaw`SELECT 1`;
        this.logger.log('Database connection successfully established and warmed up.');
        return;
      } catch (error) {
        this.logger.warn(`Database connection attempt ${attempt}/${retries} failed. Retrying in ${delayMs / 1000}s...`);
        if (attempt === retries) throw error;
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
