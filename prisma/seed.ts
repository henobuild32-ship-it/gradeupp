import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const seed = async () => {
  console.log('🌱 Seeding database...');

  const hash = async (pwd: string) => bcrypt.hash(pwd, 10);

  // ── Admin ──────────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD doit contenir au moins 12 caractères dans .env');
  }
  const hashedAdminPwd = await hash(adminPassword);
  const admin = await db.admin.upsert({
    where: { username: 'admin' },
    // ponytail: seed ne remplace jamais un mot de passe admin existant; utilisez l’API authentifiée.
    update: {},
    create: {
      username: 'admin',
      password: hashedAdminPwd,
      name: 'Administrateur TRAIT',
      role: 'super_admin',
    },
  });
  console.log('✅ Admin:', admin.name, `(${admin.username})`);

  // user1: Jean Mukendi
  const user1 = await db.user.upsert({
    where: { phone: '+243810000001' },
    update: {
      password: await hash('1234'),
      pin: await hash('0000'),
      role: 'client',
      country: 'CD',
      realBalance: 50000,
      realBalanceFC: 150000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      hasCompletedOnboarding: true,
    },
    create: {
      phone: '+243810000001',
      name: 'Jean Mukendi',
      pseudo: 'jean_m',
      country: 'CD',
      realBalance: 50000,
      realBalanceFC: 150000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      password: await hash('1234'),
      pin: await hash('0000'),
      role: 'client',
      isVerified: true,
      hasCompletedOnboarding: true,
    },
  });

  // user2: Marie Kabongo
  const user2 = await db.user.upsert({
    where: { phone: '+243820000002' },
    update: {
      password: await hash('1234'),
      pin: await hash('0000'),
      role: 'client',
      country: 'CD',
      realBalance: 25000,
      realBalanceFC: 75000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      hasCompletedOnboarding: true,
    },
    create: {
      phone: '+243820000002',
      name: 'Marie Kabongo',
      pseudo: 'marie_k',
      country: 'CD',
      realBalance: 25000,
      realBalanceFC: 75000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      password: await hash('1234'),
      pin: await hash('0000'),
      role: 'client',
      isVerified: true,
      hasCompletedOnboarding: true,
    },
  });

  // user3: Pierre Nsimba
  const user3 = await db.user.upsert({
    where: { phone: '+243830000003' },
    update: {
      password: await hash('1234'),
      pin: await hash('0000'),
      role: 'client',
      country: 'CD',
      realBalance: 100000,
      realBalanceFC: 300000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      hasCompletedOnboarding: true,
    },
    create: {
      phone: '+243830000003',
      name: 'Pierre Nsimba',
      pseudo: 'pierre_n',
      country: 'CD',
      realBalance: 100000,
      realBalanceFC: 300000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      password: await hash('1234'),
      pin: await hash('0000'),
      role: 'client',
      isVerified: true,
      hasCompletedOnboarding: true,
    },
  });

  // ── Agent ──────────────────────────────────────────────────────────
  const agentPhone = '+243840000004';
  const hashedAgentPwd = await hash('1234');
  const hashedAgentPin = await hash('0000');
  const agent = await db.user.upsert({
    where: { phone: agentPhone },
    update: {
      password: hashedAgentPwd,
      pin: hashedAgentPin,
      role: 'agent',
      agentCode: 'AGT-000001',
      country: 'CD',
      realBalance: 500000,
      realBalanceFC: 1500000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      hasCompletedOnboarding: true,
    },
    create: {
      phone: agentPhone,
      name: 'Agent TRAIT Kinshasa',
      pseudo: 'agent_kin',
      country: 'CD',
      realBalance: 500000,
      realBalanceFC: 1500000,
      bonusBalance: 10,
      bonusBalanceFC: 0,
      password: hashedAgentPwd,
      pin: hashedAgentPin,
      role: 'agent',
      agentCode: 'AGT-000001',
      isVerified: true,
      hasCompletedOnboarding: true,
    },
  });

  console.log(
    '👥 Clients:',
    user1.name,
    '|',
    user2.name,
    '|',
    user3.name,
  );
  console.log('🏢 Agent:', agent.name, `(Code: ${agent.agentCode})`);

  // ── User settings ─────────────────────────────────────────────────
  for (const u of [user1, user2, user3, agent]) {
    await db.userSettings.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        ussdLanguage: 'fr',
        defaultCurrency: 'USD',
        smsNotifications: false,
      },
    });
  }
  console.log('✅ Paramètres utilisateur créés');

  // ── App Version ───────────────────────────────────────────────────
  await db.appVersion.upsert({
    where: { version: '2.0.0' },
    update: {
      isCurrent: true,
      downloadUrl: '/downloads/trait.apk',
      description: [
        'Version 2.0 — Nouvelle identité visuelle',
        'QR Code personnel noir & blanc avec lien unique',
        'Paiement par scan : /pay/[userId]',
        'Temps réel : WebSocket Socket.IO',
        'Notifications centralisées (DB + WebSocket + Push)',
        'Mode hors ligne : files d\'attente IndexedDB',
        'Authentification à deux facteurs (2FA/TOTP)',
        'Dépôt 4 méthodes : Mobile Money, Banque, Visa, Agent',
        'Système de support client avec historique',
        'Admin KYC : validation documents + selfie',
        'Changement de PIN sécurisé',
        'USSD 28 menus hors ligne',
        'Scan QR natif via ML Kit',
        'Permissions Android optimisées',
      ].join('\n'),
    },
    create: {
      version: '2.0.0',
      isCurrent: true,
      downloadUrl: '/downloads/trait.apk',
      description: [
        'Version 2.0 — Nouvelle identité visuelle',
        'QR Code personnel noir & blanc avec lien unique',
        'Paiement par scan : /pay/[userId]',
        'Temps réel : WebSocket Socket.IO',
        'Notifications centralisées (DB + WebSocket + Push)',
        'Mode hors ligne : files d\'attente IndexedDB',
        'Authentification à deux facteurs (2FA/TOTP)',
        'Dépôt 4 méthodes : Mobile Money, Banque, Visa, Agent',
        'Système de support client avec historique',
        'Admin KYC : validation documents + selfie',
        'Changement de PIN sécurisé',
        'USSD 28 menus hors ligne',
        'Scan QR natif via ML Kit',
        'Permissions Android optimisées',
      ].join('\n'),
    },
  });
  console.log('✅ AppVersion 2.0.0 enregistrée');

  // ── Sample favorites ──────────────────────────────────────────────
  try {
    await db.ussdFavorite.createMany({
      data: [
        { userId: user1.id, label: 'Maman', phone: '+243820000002', type: 'transfer' },
        { userId: user1.id, label: 'Pierre', phone: '+243830000003', type: 'transfer' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Favoris USSD créés');
  } catch {
    console.log('ℹ️ Favoris déjà existants');
  }

  // ── Activity log ──────────────────────────────────────────────────
  await db.adminActivityLog.create({
    data: {
      adminId: admin.id,
      action: 'system_init',
      target: null,
      details: 'Initialisation du système avec données de démonstration',
    },
  });

  console.log('\n🎉 Base de données initialisée avec succès !');
  console.log('\n📋 Comptes de test (mdp en clair pour les tests uniquement) :');
  console.log('   Admin  : admin / admin1234');
  console.log('   Client : +243810000001 / 1234  (PIN: 0000) — Jean Mukendi');
  console.log('   Client : +243820000002 / 1234  (PIN: 0000) — Marie Kabongo');
  console.log('   Client : +243830000003 / 1234  (PIN: 0000) — Pierre Nsimba');
  console.log('   Agent  : +243840000004 / 1234  (PIN: 0000, Code: AGT-000001)');
}

seed()
  .catch((e) => {
    console.error('❌ Seed échoué:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
