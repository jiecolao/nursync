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
    try {
      await this.$connect();
      this.logger.log('Prisma connected to MariaDB');
    } catch (error) {
      this.logger.error(
        `Prisma connection unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
