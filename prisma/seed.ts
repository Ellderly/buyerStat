import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create teams
  const facebook = await prisma.team.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'FACEBOOK'
    }
  })

  const google = await prisma.team.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'GOOGLE'
    }
  })

  console.log('✅ Teams created:', facebook.name, google.name)

  // Hash password
  const hashedPassword = await bcrypt.hash('admin12345', 10)

  // Create admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword,
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN' // Admin has no team by default
    }
  })

  // Create teamlead
  const teamlead = await prisma.user.upsert({
    where: { username: 'teamlead' },
    update: {},
    create: {
      username: 'teamlead',
      password: hashedPassword,
      name: 'Robbie TeamLead',
      role: 'TEAMLEAD',
      teamId: facebook.id
    }
  })

  // Create buyer
  const buyer = await prisma.user.upsert({
    where: { username: 'buyer' },
    update: {},
    create: {
      username: 'buyer',
      password: hashedPassword,
      name: 'Alex Buyer',
      role: 'BUYER',
      teamId: facebook.id
    }
  })

  console.log('✅ Users created:')
  console.log('   - Admin (admin / password)')
  console.log('   - TeamLead (teamlead / password) -> Team FACEBOOK')
  console.log('   - Buyer (buyer / password) -> Team FACEBOOK')

  // Create initial offers
  const offers = [
    { name: 'EURES', value: 'EURES' },
    { name: 'EURES Capital', value: 'EURES Capital' },
    { name: 'WhatsApp_AI_v4', value: 'WhatsApp_AI_v4' },
    { name: 'WhatsApp AI', value: 'WhatsApp AI' },
    { name: 'WhatsApp AI v5', value: 'WhatsApp AI v5' },
    { name: 'WhatsApp_trade', value: 'WhatsApp_trade' },
    { name: 'Gemini', value: 'Gemini' }
  ]

  for (const offer of offers) {
    await prisma.offer.upsert({
      where: { name: offer.name },
      update: {},
      create: offer
    })
  }

  console.log('✅ Offers created:', offers.map(o => o.name).join(', '))

  console.log('\n🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
