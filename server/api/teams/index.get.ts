import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { users: true } }
    },
    orderBy: { name: 'asc' }
  })

  return {
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      usersCount: t._count.users
    }))
  }
})
