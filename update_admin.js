/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Azerty89H$', 10);
  // Check if admin exists, then update password
  const admins = await prisma.admin.findMany();
  if (admins.length > 0) {
    for (const admin of admins) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
      });
      console.log(`Updated password for admin: ${admin.username}`);
    }
  } else {
    // Create an admin if none exists
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'super_admin'
      }
    });
    console.log('Created new admin with the password');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
