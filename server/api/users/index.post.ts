import bcrypt from 'bcrypt'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')
  const body = await readBody(event)

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Validate required fields
  if (!body.username || !body.name || !body.password) {
    throw createError({ statusCode: 400, message: 'Username, name, and password are required' })
  }

  // Check if username exists
  const existing = await prisma.user.findUnique({
    where: { username: body.username }
  })

  if (existing) {
    throw createError({ statusCode: 400, message: 'Username already registered' })
  }

  // Validate role
  const validRoles = ['BUYER', 'TEAMLEAD', 'ADMIN']
  if (body.role && !validRoles.includes(body.role)) {
    throw createError({ statusCode: 400, message: 'Invalid role' })
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(body.password, 10)

  const user = await prisma.user.create({
    data: {
      username: body.username,
      name: body.name,
      password: hashedPassword,
      role: body.role || 'BUYER',
      teamId: body.teamId || null
    },
    include: { team: true }
  })

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team?.name
    }
  }
})
