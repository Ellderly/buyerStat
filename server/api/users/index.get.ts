import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  // Only admin can access
  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const users = await prisma.user.findMany({
    include: { team: true },
    orderBy: { createdAt: 'desc' }
  })

  // Remove password from response
  return {
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      teamId: u.teamId,
      teamName: u.team?.name || null,
      createdAt: u.createdAt
    }))
  }
})
