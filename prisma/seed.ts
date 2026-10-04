import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { 
  seedGender,
  seedDocumentCategories,
  seedPermissions,
  seedRoles,
  seedUsers,
  seedUserAccounts,
  seedUserAccountRoles,
  seedStudents,
  seedDocumentStatus,
  seedStudentDocuments,
  seedAuditLogs,
} from './seeds/index';
import { Logger } from '@nestjs/common';

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  connectionLimit: 5,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const prisma = new PrismaClient({ adapter });

async function seed() {
  const logger = new Logger('Seed')
  logger.log('Starting seed process...');

  await seedGender(prisma);
  logger.log('Gender seeding complete.')
  
  await seedDocumentCategories(prisma);
  logger.log('Document Categories seeding complete.')

  await seedPermissions(prisma);
  logger.log('Permissions seeding complete.')

  await seedRoles(prisma);
  logger.log('Roles seeding complete.')

  await seedUsers(prisma);
  logger.log('Users seeding complete.')

  await seedUserAccounts(prisma);
  logger.log('User Accounts seeding complete.')

  await seedUserAccountRoles(prisma);
  logger.log('User Account Roles seeding complete.')

  await seedStudents(prisma);
  logger.log('Students seeding complete.')

  await seedDocumentStatus(prisma);
  logger.log('Document Status seeding complete.')

  await seedStudentDocuments(prisma);
  logger.log('Student Documents seeding complete.')

  await seedAuditLogs(prisma);
  logger.log('Audit Logs seeding complete.')

  logger.log('All seeds are completed.')
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });