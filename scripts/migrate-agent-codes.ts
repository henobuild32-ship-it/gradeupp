import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAgentCodes() {
  const agents = await prisma.user.findMany({
    where: { role: 'agent' },
    select: { id: true, phone: true, agentCode: true, agentNumber: true },
  })

  let updated = 0
  for (const agent of agents) {
    const phone = agent.phone.replace(/\D/g, '')
    const expectedCode = `AGT-${phone}`

    if (agent.agentCode === expectedCode && agent.agentNumber === expectedCode) {
      continue
    }

    await prisma.user.update({
      where: { id: agent.id },
      data: {
        agentCode: expectedCode,
        agentNumber: expectedCode,
      },
    })

    console.log(`Migrated: ${agent.phone} -> ${expectedCode} (was: ${agent.agentCode})`)
    updated++
  }

  console.log(`\nDone. ${updated} agent(s) migrated out of ${agents.length} total.`)
}

migrateAgentCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
