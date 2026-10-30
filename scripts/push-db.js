import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

console.log('Pushing schema to test branch...');
if (process.env.TEST_DATABASE_URL) {
  try {
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
    console.log('Test branch schema pushed successfully.');
  } catch (err) {
    console.error('Failed to push to test branch:', err.message);
  }
}

console.log('Generating Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit' });
