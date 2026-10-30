import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { DEFAULT_TABLES } from '../src/shared/constants.js';
import { generateSampleReservations } from '../src/services/sampleData.js';
import { getTodayKolkata } from '../src/shared/time.js';

dotenv.config();

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.error('ERROR: TEST_DATABASE_URL is not set. Refusing to seed.');
  process.exit(1);
}

if (process.env.DATABASE_URL && testDbUrl === process.env.DATABASE_URL) {
  console.error('SECURITY GUARD TRIGGERED: TEST_DATABASE_URL matches DATABASE_URL. Refusing to seed production branch.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

async function main() {
  console.log('Seeding sandbox on dedicated Neon test branch...');

  const slug = 'sandbox';
  const salt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash('sandbox1234', salt);

  // Check or create sandbox restaurant
  let sandbox = await prisma.restaurant.findUnique({
    where: { slug },
    include: { tables: true },
  });

  if (!sandbox) {
    sandbox = await prisma.restaurant.create({
      data: {
        slug,
        name: 'Sandbox Dining Lounge',
        phone: '+919999999999',
        openTime: '12:00',
        closeTime: '23:00',
        maxPartySize: 8,
        mustChangePassword: false,
        ownerPasswordHash,
        tables: {
          create: DEFAULT_TABLES.map((t) => ({
            number: t.number,
            capacity: t.capacity,
          })),
        },
      },
      include: { tables: true },
    });
    console.log(`Created sandbox restaurant: ${sandbox.name} (slug: ${sandbox.slug})`);
  } else {
    console.log(`Sandbox restaurant already exists (ID: ${sandbox.id})`);
  }

  // Create sample reservations if empty
  const count = await prisma.reservation.count({
    where: { restaurantId: sandbox.id },
  });

  if (count === 0) {
    const samples = generateSampleReservations(getTodayKolkata());
    const tableMap = new Map(sandbox.tables.map((t) => [t.number, t.id]));

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const tableNumber = s.tableId ? s.tableId.replace(/^T/, '') : null;
      const assignedTableId = tableNumber ? tableMap.get(tableNumber) || null : null;
      const uniqueRef = `SB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await prisma.reservation.create({
        data: {
          restaurantId: sandbox.id,
          reference: uniqueRef,
          name: s.name,
          phone: s.phone,
          date: s.date,
          time: s.time,
          guests: s.guests,
          notes: s.notes,
          status: s.status,
          source: s.source,
          tableId: assignedTableId,
          statusEvents: {
            create: [
              {
                toStatus: 'pending',
                reason: 'Sandbox initial creation',
              },
            ],
          },
        },
      });
    }
    console.log(`Seeded ${samples.length} sample reservations into sandbox restaurant.`);
  }

  console.log('Sandbox seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
