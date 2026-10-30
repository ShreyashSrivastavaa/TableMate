import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

if (isTest) {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      'SECURITY GUARD TRIGGERED: Tests MUST run using TEST_DATABASE_URL pointing to the dedicated test branch. Refusing to run tests against DATABASE_URL.'
    );
  }
  if (process.env.DATABASE_URL && process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error(
      'SECURITY GUARD TRIGGERED: TEST_DATABASE_URL cannot be identical to DATABASE_URL. Use the dedicated Neon test branch.'
    );
  }
}

const connectionUrl = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: { db: { url: connectionUrl } },
  });
} else {
  if (!global.__tablemate_prisma) {
    global.__tablemate_prisma = new PrismaClient({
      datasources: { db: { url: connectionUrl } },
    });
  }
  prisma = global.__tablemate_prisma;
}

export default prisma;
