import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const { userId, role } = session

  // Pagination params
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 25
  const skip = (page - 1) * limit

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
    const end = new Date(query.endDate as string)
    end.setHours(23, 59, 59, 999)
    whereClause.date = {
      ...whereClause.date,
      lte: end
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

  // Get total count for pagination
  const total = await prisma.statistic.count({ where: whereClause })

  // Get aggregated totals for ALL matching records (not just current page)
  const aggregates = await prisma.statistic.aggregate({
    where: whereClause,
    _sum: {
      leads: true,
      spend: true,
      ftd: true,
      revenue: true
    }
  })

  const totalLeads = aggregates._sum.leads || 0
  const totalSpend = aggregates._sum.spend || 0
  const totalFtd = aggregates._sum.ftd || 0
  const totalRevenue = aggregates._sum.revenue || 0
  const totalProfit = totalRevenue - totalSpend
  const totalRoi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0
  const totalCpl = totalLeads > 0 ? totalSpend / totalLeads : 0
  const totalCr = totalLeads > 0 ? (totalFtd / totalLeads) * 100 : 0

  // Get paginated statistics
  const statistics = await prisma.statistic.findMany({
    where: whereClause,
    include: {
      user: {
        select: { name: true, username: true }
      }
    },
    orderBy: { date: 'desc' },
    skip,
    take: limit
  })

  return { 
    statistics,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    totals: {
      leads: totalLeads,
      spend: totalSpend,
      ftd: totalFtd,
      revenue: totalRevenue,
      profit: totalProfit,
      roi: totalRoi,
      cpl: totalCpl,
      cr: totalCr
    }
  }
})
