import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const { userId, role } = session

  // Calculate date range based on period
  const period = (query.period as string) || 'week'
  const endDate = new Date()
  const startDate = new Date()

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      // Set to yesterday - both dates need to be yesterday
      endDate.setDate(endDate.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
      startDate.setDate(startDate.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
      break
    case '3days':
      startDate.setDate(endDate.getDate() - 3)
      break
    case 'week':
      startDate.setDate(endDate.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1)
      break
  }

  // Build where clause based on role
  let whereClause: any = {
    date: {
      gte: startDate,
      lte: endDate
    }
  }

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

  // Get current period statistics
  const currentStats = await prisma.statistic.aggregate({
    where: whereClause,
    _sum: {
      leads: true,
      spend: true,
      ftd: true,
      revenue: true
    }
  })

  // Calculate previous period for comparison
  const prevEndDate = new Date(startDate)
  prevEndDate.setDate(prevEndDate.getDate() - 1)
  const prevStartDate = new Date(prevEndDate)

  switch (period) {
    case 'yesterday':
      prevStartDate.setDate(prevEndDate.getDate() - 1)
      break
    case '3days':
      prevStartDate.setDate(prevEndDate.getDate() - 2)
      break
    case 'week':
      prevStartDate.setDate(prevEndDate.getDate() - 6)
      break
    case 'month':
      prevStartDate.setMonth(prevEndDate.getMonth() - 1)
      break
  }

  const prevWhereClause = {
    ...whereClause,
    date: {
      gte: prevStartDate,
      lte: prevEndDate
    }
  }

  const prevStats = await prisma.statistic.aggregate({
    where: prevWhereClause,
    _sum: {
      leads: true,
      spend: true,
      ftd: true,
      revenue: true
    }
  })

  // Calculate metrics
  const leads = currentStats._sum.leads || 0
  const spend = currentStats._sum.spend || 0
  const ftd = currentStats._sum.ftd || 0
  const revenue = currentStats._sum.revenue || 0
  const profit = revenue - spend
  const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0
  const cpl = leads > 0 ? spend / leads : 0

  const prevLeads = prevStats._sum.leads || 0
  const prevSpend = prevStats._sum.spend || 0
  const prevRevenue = prevStats._sum.revenue || 0
  const prevProfit = prevRevenue - prevSpend
  const prevRoi = prevSpend > 0 ? ((prevRevenue - prevSpend) / prevSpend) * 100 : 0

  // Get top creatives
  const statistics = await prisma.statistic.findMany({
    where: whereClause,
    select: {
      creative: true,
      offer: true,
      source: true,
      leads: true,
      spend: true,
      revenue: true
    }
  })

  // Aggregate by creative
  const creativeMap: Record<string, { 
    creative: string
    offer: string
    leads: number
    spend: number
    revenue: number 
  }> = {}

  for (const stat of statistics) {
    const key = stat.creative
    if (!creativeMap[key]) {
      creativeMap[key] = {
        creative: stat.creative,
        offer: stat.offer,
        leads: 0,
        spend: 0,
        revenue: 0
      }
    }
    creativeMap[key].leads += stat.leads
    creativeMap[key].spend += stat.spend
    creativeMap[key].revenue += stat.revenue
  }

  const topCreatives = Object.values(creativeMap)
    .map(c => ({
      ...c,
      profit: c.revenue - c.spend,
      roi: c.spend > 0 ? ((c.revenue - c.spend) / c.spend) * 100 : 0
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5)

  // Aggregate by source
  const sourceMap: Record<string, { source: string; spend: number; revenue: number }> = {}
  for (const stat of statistics) {
    if (!sourceMap[stat.source]) {
      sourceMap[stat.source] = { source: stat.source, spend: 0, revenue: 0 }
    }
    sourceMap[stat.source].spend += stat.spend
    sourceMap[stat.source].revenue += stat.revenue
  }
  const sourceData = Object.values(sourceMap).sort((a, b) => b.revenue - a.revenue)

  // Get daily trend data
  const dailyStats = await prisma.statistic.groupBy({
    by: ['date'],
    where: whereClause,
    _sum: {
      spend: true,
      revenue: true
    },
    orderBy: { date: 'asc' }
  })

  const trendData = dailyStats.map(d => ({
    date: d.date.toISOString().split('T')[0],
    spend: d._sum.spend || 0,
    revenue: d._sum.revenue || 0
  }))

  return {
    kpis: {
      leads: { value: leads, change: prevLeads > 0 ? ((leads - prevLeads) / prevLeads) * 100 : 0 },
      ftd: { value: ftd, change: prevStats._sum.ftd ? ((ftd - (prevStats._sum.ftd || 0)) / (prevStats._sum.ftd || 1)) * 100 : 0 },
      spend: { value: spend, change: prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : 0 },
      revenue: { value: revenue, change: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0 },
      profit: { value: profit, change: Math.abs(prevProfit) > 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : 0 },
      roi: { value: roi, change: roi - prevRoi },
      cpl: { value: cpl }
    },
    topCreatives,
    trendData,
    sourceData
  }
})

