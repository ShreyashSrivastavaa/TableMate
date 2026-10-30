import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_TABLES } from '../src/shared/constants.js';
import { generateSampleReservations } from '../src/services/sampleData.js';
import { getTodayKolkata } from '../src/shared/time.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Neon PostgreSQL with default "demo" restaurant...');

  const slug = 'demo';
  const salt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash('demo1234', salt);

  // Check or upsert demo restaurant
  let demo = await prisma.restaurant.findUnique({
    where: { slug },
    include: { tables: true },
  });

  if (!demo) {
    demo = await prisma.restaurant.create({
      data: {
        slug,
        name: 'The Coastal Bistro',
        phone: '+91 98450 12345',
        openTime: '12:00',
        closeTime: '23:00',
        maxPartySize: 8,
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
    console.log(`Created demo restaurant: ${demo.name} (slug: ${demo.slug})`);
  } else {
    console.log(`Demo restaurant already exists (ID: ${demo.id})`);
  }

  // Create sample reservations if empty
  const count = await prisma.reservation.count({
    where: { restaurantId: demo.id },
  });

  if (count === 0) {
    const samples = generateSampleReservations(getTodayKolkata());
    const tableMap = new Map(demo.tables.map((t) => [t.number, t.id]));

    for (const s of samples) {
      const tableNumber = s.tableId ? s.tableId.replace(/^T/, '') : null;
      const assignedTableId = tableNumber ? tableMap.get(tableNumber) || null : null;

      await prisma.reservation.create({
        data: {
          restaurantId: demo.id,
          reference: s.reference,
          name: s.name,
          phone: s.phone,
          date: s.date,
          time: s.time,
          guests: s.guests,
          notes: s.notes,
          status: s.status,
          source: s.source,
          tableId: assignedTableId,
          createdAt: new Date(s.createdAt),
          statusEvents: {
            create: s.statusHistory.map((h) => ({
              fromStatus: h.from,
              toStatus: h.to,
              reason: h.reason,
              timestamp: new Date(h.timestamp),
            })),
          },
        },
      });
    }
    console.log(`Seeded ${samples.length} sample reservations for demo restaurant.`);
  } else {
    console.log(`Demo restaurant already has ${count} reservations.`);
  }

  console.log('✅ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
