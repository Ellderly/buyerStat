import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  // Check if statistic exists
  const existing = await prisma.statistic.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Statistic not found' })
  }

  // Check permissions
  if (session.role === 'BUYER' && existing.userId !== session.userId) {
    throw createError({ statusCode: 403, message: 'You can only edit your own statistics' })
  }

  // Update
  const statistic = await prisma.statistic.update({
    where: { id },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      source: body.source,
      geo: body.geo,
      offer: body.offer,
      creative: body.creative,
      leads: body.leads !== undefined ? parseInt(body.leads) : undefined,
      spend: body.spend !== undefined ? parseFloat(body.spend) : undefined,
      ftd: body.ftd !== undefined ? parseInt(body.ftd) : undefined,
      revenue: body.revenue !== undefined ? parseFloat(body.revenue) : undefined,
      // Telegram-specific fields (CPC/CPA рассчитываются на клиенте)
      subscribers: body.source === 'TELEGRAM' ? (parseInt(body.subscribers) || null) : null,
      clicks: body.source === 'TELEGRAM' ? (parseInt(body.clicks) || null) : null
    }
  })

  return { success: true, statistic }
})
