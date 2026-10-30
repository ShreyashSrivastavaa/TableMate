import prisma from '../server/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { DEFAULT_TABLES } from '../src/shared/constants.js';

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const slug = args.slug;
  const name = args.name;
  if (!slug || !name) {
    console.log(`
Usage:
  node scripts/onboard-restaurant.js --slug=<slug> --name=<name> [options]

Options:
  --slug=restaurant-slug        Unique URL identifier (required)
  --name="Restaurant Name"      Display name (required)
  --address="Street Address"    Physical address
  --phone="+919876543210"       Contact phone number
  --whatsapp="+919876543210"    WhatsApp contact number
  --open="12:00"                Opening time (default: 12:00)
  --close="23:00"               Closing time (default: 23:00)
  --closedDays="Monday"         Comma-separated closed days
  --maxParty=8                  Maximum party size (default: 8)
  --password="CustomPassword"   Initial temporary password (auto-generated if omitted)
`);
    process.exit(1);
  }

  const existing = await prisma.restaurant.findUnique({ where: { slug } });
  if (existing) {
    console.error(`Error: Restaurant with slug "${slug}" already exists (ID: ${existing.id}).`);
    process.exit(1);
  }

  if (args.password && args.password.length < 12) {
    console.error('Error: Owner password must be at least 12 characters.');
    process.exit(1);
  }

  const tempPassword = args.password || `TMP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const salt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash(tempPassword, salt);

  const closedDaysArr = args.closedDays ? args.closedDays.split(',').map((d) => d.trim()) : [];

  const restaurant = await prisma.restaurant.create({
    data: {
      slug,
      name,
      address: args.address || '',
      phone: args.phone || '',
      whatsappNumber: args.whatsapp || args.phone || '',
      openTime: args.open || '12:00',
      closeTime: args.close || '23:00',
      closedDays: JSON.stringify(closedDaysArr),
      maxPartySize: args.maxParty ? parseInt(args.maxParty, 10) : 8,
      ownerPasswordHash,
      mustChangePassword: true,
      tables: {
        create: DEFAULT_TABLES.map((t) => ({
          number: t.number,
          capacity: t.capacity,
        })),
      },
    },
    include: { tables: true },
  });

  const baseUrl = process.env.BASE_URL || 'https://tablemate-ai.vercel.app';
  const bookingUrl = `${baseUrl}/r/${slug}/book`;
  const adminUrl = `${baseUrl}/r/${slug}/admin`;

  // Generate QR code file
  const qrDir = path.resolve('public', 'qr');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }
  const qrFilePath = path.join(qrDir, `${slug}.png`);
  await QRCode.toFile(qrFilePath, bookingUrl, {
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Generate ASCII QR for terminal
  const asciiQR = await QRCode.toString(bookingUrl, { type: 'terminal', small: true });

  console.log(`
=================================================================
             RESTAURANT ONBOARDED SUCCESSFULLY
=================================================================
Restaurant Name:  ${restaurant.name}
Slug:             ${restaurant.slug}
Internal ID:      ${restaurant.id}
Operating Hours:  ${restaurant.openTime} - ${restaurant.closeTime}
Physical Tables:  ${restaurant.tables.length} tables configured
Closed Days:      ${closedDaysArr.length > 0 ? closedDaysArr.join(', ') : 'None (Open 7 days)'}

ACCESS LINKS:
- Customer Booking Link: ${bookingUrl}
- Owner Admin Dashboard: ${adminUrl}

CREDENTIALS (Temporary):
- Initial Password:   ${tempPassword}
- First-Login Status: MUST CHANGE PASSWORD ON FIRST LOGIN

QR CODE GENERATED:
- File saved to:      public/qr/${slug}.png
${asciiQR}
=================================================================
`);
}

main()
  .catch((e) => {
    console.error('Onboarding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
