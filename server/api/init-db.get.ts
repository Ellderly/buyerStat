import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    console.log('🌱 Seeding database via API...')

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
    update: {
        password: hashedPassword,
    },
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
    update: {
        password: hashedPassword,
    },
    create: {
      username: 'buyer',
      password: hashedPassword,
      name: 'Alex Buyer',
      role: 'BUYER',
      teamId: facebook.id
    }
  })

    return {
      status: 'success',
      message: 'Database seeded successfully!',
      users: {
        admin: admin.username,
        teamlead: teamlead.username,
        buyer: buyer.username
      }
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Seeding failed',
      data: error
    })
  } finally {
    await prisma.$disconnect()
  }
})
