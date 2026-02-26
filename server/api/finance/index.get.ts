import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  const { role } = session

  // Only FINANCIER and ADMIN can access
  if (role !== 'FINANCIER' && role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Pagination params
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 25
  const skip = (page - 1) * limit

  // Build where clause
  let whereClause: any = {}

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

  // Employee filter
  if (query.userId) {
    whereClause.userId = parseInt(query.userId as string)
  }

  // Get total count
  const total = await prisma.statistic.count({ where: whereClause })

  // Get statistics with only spend-related data (paginated)
  const statistics = await prisma.statistic.findMany({
    where: whereClause,
    select: {
      id: true,
      date: true,
      source: true,
      spend: true,
      creative: true,
      offer: true,
      geo: true,
      user: {
        select: { id: true, name: true }
      }
    },
    orderBy: { date: 'desc' },
    skip,
    take: limit
  })

  // Calculate total spend
  const aggregates = await prisma.statistic.aggregate({
    where: whereClause,
    _sum: {
      spend: true
    }
  })

  // Calculate per-source breakdown (from ALL records, not paginated)
  const allStats = await prisma.statistic.groupBy({
    by: ['source'],
    where: whereClause,
    _sum: {
      spend: true
    }
  })

  const sourceBreakdown = allStats
    .map(s => ({ source: s.source, spend: s._sum.spend || 0 }))
    .sort((a, b) => b.spend - a.spend)

  // Get all users for the employee filter
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'FINANCIER' }
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return {
    statistics,
    totalSpend: aggregates._sum.spend || 0,
    sourceBreakdown,
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
