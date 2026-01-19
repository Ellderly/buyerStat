import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const { userId, role } = session

  // Build filter based on role
  let whereClause: any = {}

  // Filter by user role
  if (role === 'BUYER') {
    whereClause.userId = userId
  } else if (role === 'TEAMLEAD' && session.teamId) {
    const teamUsers = await prisma.user.findMany({
      where: { teamId: session.teamId },
      select: { id: true }
    })
    const userIds = teamUsers.map(u => u.id)
    whereClause.userId = { in: userIds }
  }
  // ADMIN sees all

  // Date filter
  if (query.startDate) {
    whereClause.date = {
      ...whereClause.date,
      gte: new Date(query.startDate as string)
    }
  }
  if (query.endDate) {
    whereClause.date = {
      ...whereClause.date,
      lte: new Date(query.endDate as string)
    }
  }

  // Source filter
  if (query.source) {
    whereClause.source = query.source
  }

  // Geo filter
  if (query.geo) {
    whereClause.geo = query.geo
  }

  // Offer filter
  if (query.offer) {
    whereClause.offer = query.offer
  }

  // Creative filter (search by partial name)
  if (query.creative) {
    whereClause.creative = {
      contains: query.creative as string,
      mode: 'insensitive'
    }
  }

  // UserId filter (for employee filter)
  if (query.userId) {
    whereClause.userId = parseInt(query.userId as string)
  }

  const statistics = await prisma.statistic.findMany({
    where: whereClause,
    include: {
      user: {
        select: { name: true, username: true }
      }
    },
    orderBy: { date: 'desc' }
  })

  return { statistics }
})
