import prisma from '../server/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

  if (!slug) {
    console.log(`
Usage:
  node scripts/reset-password.js --slug=<restaurant-slug> [--password=<new-password>]
`);
    process.exit(1);
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    console.error(`Error: Restaurant with slug "${slug}" not found.`);
    process.exit(1);
  }

  if (args.password && args.password.length < 12) {
    console.error('Error: Owner password must be at least 12 characters.');
    process.exit(1);
  }

  const newPassword = args.password || `RST-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const salt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash(newPassword, salt);

  await prisma.restaurant.update({
    where: { slug },
    data: {
      ownerPasswordHash,
      mustChangePassword: true,
    },
  });

  console.log(`
=================================================================
             PASSWORD RESET COMPLETE
=================================================================
Restaurant:          ${restaurant.name} (${restaurant.slug})
New Temporary Pass:  ${newPassword}
Password Change Req: YES (Owner will be prompted to update on login)
=================================================================
`);
}

main()
  .catch((e) => {
    console.error('Password reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
