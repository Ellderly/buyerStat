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
