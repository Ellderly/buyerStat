import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const role = session.role

  // Only ADMIN and TEAMLEAD can view employee analytics
  if (role !== 'ADMIN' && role !== 'TEAMLEAD') {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const query = getQuery(event)
  const period = (query.period as string) || 'week'
  const source = query.source as string | undefined
  const endDate = new Date()
  const startDate = new Date()

  // Handle 'today' periods and others
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      startDate.setDate(endDate.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(endDate.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
      break
    case '3days':
      startDate.setDate(endDate.getDate() - 3)
      break
    case 'week':
      startDate.setDate(endDate.getDate() - 7)
      break
    case 'currentMonth':
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1)
      break
    case 'prevMonth':
      startDate.setMonth(startDate.getMonth() - 1)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'all':
      startDate.setFullYear(2020, 0, 1)
      break
  }

  // Build where clause
  let whereClause: any = {
    date: {
      gte: startDate,
      lte: endDate
    }
  }

  // Source filter for ADMIN
  if (source && role === 'ADMIN') {
    whereClause.source = source
  }

  if (role === 'TEAMLEAD' && session.teamId) {
    const teamUsers = await prisma.user.findMany({
      where: { teamId: session.teamId },
      select: { id: true }
    })
    const userIds = teamUsers.map(u => u.id)
    whereClause.userId = { in: userIds }
  }

  const stats = await prisma.statistic.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })

  // Group by User (aggregate all sources or filtered source)
  const userStats: Record<number, any> = {}

  for (const stat of stats) {
    const userId = stat.userId
    
    if (!userStats[userId]) {
      userStats[userId] = {
        userId: userId,
        name: stat.user.name,
        username: stat.user.username,
        leads: 0,
        spend: 0,
        ftd: 0,
        revenue: 0,
        profit: 0
      }
    }

    const s = userStats[userId]
    s.leads += stat.leads
    s.spend += stat.spend
    s.ftd += stat.ftd
    s.revenue += stat.revenue
  }

  // Calculate derived metrics and convert to array
  const employees = Object.values(userStats).map(u => {
    u.profit = u.revenue - u.spend
    u.roi = u.spend > 0 ? ((u.revenue - u.spend) / u.spend) * 100 : 0
    u.cpl = u.leads > 0 ? u.spend / u.leads : 0
    u.cr = u.leads > 0 ? (u.ftd / u.leads) * 100 : 0
    return u
  })

  // Sort by profit desc
  employees.sort((a, b) => b.profit - a.profit)

  return { employees }
})
