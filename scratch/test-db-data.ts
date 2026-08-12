import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const links = await prisma.paymentLink.findMany({
    include: { user: true }
  })
  console.log('--- Payment Links ---')
  console.log(JSON.stringify(links, null, 2))
  
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, name: true }
  })
  console.log('--- Users ---')
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
