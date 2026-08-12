/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const prisma = new PrismaClient();

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:trait137@gmail.com';
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BBPKKvtLLzdznu4tmoOPFje1JlSGyg_Sue2SSbkRYaP9Q5XtMT1R3YESSpO7M29dnqHWWogWau_Mnf2XgejcETs';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'q1cf1PnGyHitRj5wHgNdVZ3ZsEFBSUIDnasejrKrBqI';

webpush.setVapidDetails(vapidSubject, publicKey, privateKey);

async function main() {
  console.log('Retrieving active push subscriptions...');
  const subscriptions = await prisma.pushSubscription.findMany();
  
  if (subscriptions.length === 0) {
    console.log('No active push subscriptions found in the database. Please sign in to the app on a device first to register.');
    return;
  }

  console.log(`Sending "New Version" push notification to ${subscriptions.length} active subscription(s)...`);
  
  const payload = JSON.stringify({
    title: "Mise à jour TRAIT",
    body: "Une nouvelle version de l'application est disponible. Cliquez pour recharger et profiter des dernières nouveautés !",
    icon: '/trait-logo.png',
    badge: '/trait-logo.png',
    url: '/'
  });

  let successCount = 0;
  let failCount = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload
      );
      console.log(`[SUCCESS] Push sent successfully to endpoint: ${sub.endpoint.substring(0, 40)}...`);
      successCount++;
    } catch (error) {
      console.error(`[FAILED] Failed to send push to endpoint: ${sub.endpoint.substring(0, 40)}...`);
      console.error(`Error details: ${error.message}`);
      failCount++;

      // Clean up expired subscription
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: sub.endpoint }
        });
        console.log('Removed expired subscription from database.');
      }
    }
  }

  console.log(`\nPush notification task complete.`);
  console.log(`Total sent: ${successCount}`);
  console.log(`Total failed: ${failCount}`);
}

main()
  .catch(err => {
    console.error('Fatal error during push process:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
