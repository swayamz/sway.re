import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create a test user
  const testUser = await prisma.user.create({
    data: {
      characterId: 2112540434,
      characterName: 'Sway Re',
      corporationId: 98477766,
      isAdmin: true,
    },
  })

  // Create a test timerboard
  const testTimerboard = await prisma.timerboard.create({
    data: {
      name: 'Test Alliance Timers',
      description: 'Test timerboard for development',
      createdBy: testUser.id,
    },
  })

  // Add user to timerboard as admin
  await prisma.userTimerboard.create({
    data: {
      userId: testUser.id,
      timerboardId: testTimerboard.id,
      role: 'ADMIN',
    },
  })

  // Create some test timers
  await prisma.timer.create({
    data: {
      timerboardId: testTimerboard.id,
      structureType: 'ORBITAL_SKYHOOK',
      system: 'VK-A5G',
      location: 'Cache IV',
      owner: 'Fanatic HQ',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      addedBy: testUser.id,
    },
  })

  await prisma.timer.create({
    data: {
      timerboardId: testTimerboard.id,
      structureType: 'ORBITAL_SKYHOOK',
      system: 'VK-A5G',
      location: 'Cache VIII',
      owner: 'Fanatic HQ',
      expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
      addedBy: testUser.id,
    },
  })

  await prisma.timer.create({
    data: {
      timerboardId: testTimerboard.id,
      structureType: 'ASTRAHUS',
      system: 'RV5-TT',
      location: 'Cache - Bravo',
      owner: 'Horde',
      layer: 'ARMOR',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      addedBy: testUser.id,
      notes: 'High priority target',
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })