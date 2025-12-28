import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const { userId, role } = session
  const groupBy = (query.groupBy as string) || 'date'

  // Build filter based on role
  let whereClause: any = {}

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

  // Date filter
  if (query.startDate) {
    whereClause.date = { ...whereClause.date, gte: new Date(query.startDate as string) }
  }
  if (query.endDate) {
    whereClause.date = { ...whereClause.date, lte: new Date(query.endDate as string) }
  }

  // Get all statistics
  const statistics = await prisma.statistic.findMany({
    where: whereClause,
    orderBy: { date: 'desc' }
  })

  // Group and aggregate
  const grouped: Record<string, {
    key: string
    leads: number
    spend: number
    ftd: number
    revenue: number
    count: number
  }> = {}

  for (const stat of statistics) {
    let key = ''
    switch (groupBy) {
      case 'date':
        key = new Date(stat.date).toISOString().split('T')[0]
        break
      case 'offer':
        key = stat.offer
        break
      case 'creative':
        key = stat.creative
        break
      case 'geo':
        key = stat.geo
        break
      case 'source':
        key = stat.source
        break
      default:
        key = new Date(stat.date).toISOString().split('T')[0]
    }

    if (!grouped[key]) {
      grouped[key] = { key, leads: 0, spend: 0, ftd: 0, revenue: 0, count: 0 }
    }

    grouped[key].leads += stat.leads
    grouped[key].spend += stat.spend
    grouped[key].ftd += stat.ftd
    grouped[key].revenue += stat.revenue
    grouped[key].count += 1
  }

  // Calculate derived metrics
  const results = Object.values(grouped).map(g => ({
    ...g,
    profit: g.revenue - g.spend,
    roi: g.spend > 0 ? ((g.revenue - g.spend) / g.spend) * 100 : 0,
    cpl: g.leads > 0 ? g.spend / g.leads : 0,
    cr: g.leads > 0 ? (g.ftd / g.leads) * 100 : 0
  }))

  // Sort by key
  results.sort((a, b) => {
    if (groupBy === 'date') {
      return new Date(b.key).getTime() - new Date(a.key).getTime()
    }
    return a.key.localeCompare(b.key)
  })

  // Calculate totals
  const totals = {
    leads: results.reduce((sum, r) => sum + r.leads, 0),
    spend: results.reduce((sum, r) => sum + r.spend, 0),
    ftd: results.reduce((sum, r) => sum + r.ftd, 0),
    revenue: results.reduce((sum, r) => sum + r.revenue, 0),
    profit: 0,
    roi: 0,
    cpl: 0,
    cr: 0
  }
  totals.profit = totals.revenue - totals.spend
  totals.roi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0
  totals.cpl = totals.leads > 0 ? totals.spend / totals.leads : 0
  totals.cr = totals.leads > 0 ? (totals.ftd / totals.leads) * 100 : 0

  return { results, totals }
})
