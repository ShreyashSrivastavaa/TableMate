import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_TABLES, DEFAULT_SETTINGS } from '../src/shared/constants.js';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = val;
    }
  }
  return options;
}

export async function createRestaurant({
  slug,
  name,
  password,
  phone = '+91 98450 12345',
  openTime = '12:00',
  closeTime = '23:00',
  maxPartySize = 8,
}) {
  if (!slug || !name || !password) {
    throw new Error('Missing required arguments: --slug, --name, --password');
  }

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
  const existing = await prisma.restaurant.findUnique({
    where: { slug: cleanSlug },
  });

  if (existing) {
    throw new Error(`Restaurant with slug "${cleanSlug}" already exists (ID: ${existing.id})`);
  }

  const salt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash(password, salt);

  const restaurant = await prisma.restaurant.create({
    data: {
      slug: cleanSlug,
      name: name.trim(),
      phone: phone.trim(),
      openTime,
      closeTime,
      maxPartySize: Number(maxPartySize) || 8,
      ownerPasswordHash,
      tables: {
        create: DEFAULT_TABLES.map((t) => ({
          number: t.number,
          capacity: t.capacity,
        })),
      },
    },
    include: {
      tables: true,
    },
  });

  return restaurant;
}

async function main() {
  const options = parseArgs();
  if (!options.slug || !options.name || !options.password) {
    console.error('Usage: npm run create-restaurant -- --slug <slug> --name "<name>" --password "<password>"');
    process.exit(1);
  }

  try {
    const restaurant = await createRestaurant(options);
    console.log('\n✅ Successfully created pilot restaurant on Neon PostgreSQL:');
    console.log(`   - Name: ${restaurant.name}`);
    console.log(`   - Slug: ${restaurant.slug}`);
    console.log(`   - Tables created: ${restaurant.tables.length}`);
    console.log(`   - Customer Booking URL: /r/${restaurant.slug}/book`);
    console.log(`   - Owner Admin Dashboard: /r/${restaurant.slug}/admin\n`);
  } catch (err) {
    console.error(`❌ Error creating restaurant: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('createRestaurant.js')) {
  main();
}
