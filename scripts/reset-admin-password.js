const { randomBytes } = require('node:crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const usernameArg = process.argv.find((arg) => arg.startsWith('--username='))?.slice('--username='.length)
  const username = usernameArg?.normalize('NFKC').trim().toLowerCase()
  if (!username) throw new Error('Usage: node scripts/reset-admin-password.js --username=admin')

  const admin = await prisma.admin.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
  if (!admin) throw new Error('Aucun administrateur correspondant.')

  let oneTimePassword
  do {
    oneTimePassword = randomBytes(32).toString('base64url')
  } while (!/[a-z]/.test(oneTimePassword) || !/[A-Z]/.test(oneTimePassword) || !/\d/.test(oneTimePassword))
  const passwordHash = await bcrypt.hash(oneTimePassword, 12)
  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: passwordHash, authVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null },
  })

  process.stdout.write(`Mot de passe temporaire pour ${admin.username} (affiché une seule fois) :\n${oneTimePassword}\nConnectez-vous puis changez-le immédiatement dans les paramètres admin.\n`)
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Réinitialisation impossible'}\n`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
