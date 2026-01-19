import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const query = getQuery(event)
  const teamOnly = query.teamOnly === 'true'

  // TEAMLEAD can access team members with teamOnly flag
  if (teamOnly && session.role === 'TEAMLEAD' && session.teamId) {
    const teamUsers = await prisma.user.findMany({
      where: { teamId: session.teamId },
      include: { team: true },
      orderBy: { createdAt: 'desc' }
    })

    return {
      users: teamUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        teamId: u.teamId,
        teamName: u.team?.name || null,
        createdAt: u.createdAt
      }))
    }
  }

  // Only admin can access all users
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
