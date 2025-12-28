import bcrypt from 'bcrypt'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: 'Логин и пароль обязательны'
    })
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
    include: { team: true }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Неверный логин или пароль'
    })
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password)

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: 'Неверный логин или пароль'
    })
  }

  // Set session cookie
  setCookie(event, 'auth_session', JSON.stringify({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team?.name
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
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
