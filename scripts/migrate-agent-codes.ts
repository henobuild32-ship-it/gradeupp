import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateAgentCode(): string {
  return `AGT-${Math.floor(100000 + Math.random() * 900000)}`
}

async function migrateAgentCodes() {
  const agents = await prisma.user.findMany({
    where: { role: 'agent' },
    select: { id: true, phone: true, agentCode: true, agentNumber: true },
  })

  let updated = 0
  for (const agent of agents) {
    const isValid = /^AGT-\d{6}$/.test(agent.agentCode || '')
    const isSynced = agent.agentCode && agent.agentCode === agent.agentNumber

    if (isValid && isSynced) continue

    let agentCode = isValid ? agent.agentCode! : ''
    if (!agentCode) {
      for (let i = 0; i < 30; i++) {
        const candidate = generateAgentCode()
        const existing = await prisma.user.findUnique({ where: { agentCode: candidate } })
        if (!existing) {
          agentCode = candidate
          break
        }
      }
    }
    if (!agentCode) continue

    const clash = await prisma.user.findFirst({
      where: { agentCode, id: { not: agent.id } },
    })
    if (clash) continue

    await prisma.user.update({
      where: { id: agent.id },
      data: {
        agentCode,
        agentNumber: agentCode,
      },
    })

    console.log(`Migrated: ${agent.phone} -> ${agentCode} (was: ${agent.agentCode})`)
    updated++
  }

  console.log(`\nDone. ${updated} agent(s) migrated out of ${agents.length} total.`)
}

migrateAgentCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
