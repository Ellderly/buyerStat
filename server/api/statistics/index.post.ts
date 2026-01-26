import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  // Validate required fields
  const requiredFields = ['date', 'source', 'geo', 'offer', 'creative']
  for (const field of requiredFields) {
    if (!body[field]) {
      throw createError({
        statusCode: 400,
        message: `Field "${field}" is required`
      })
    }
  }

  // Validate source
  const validSources = ['FACEBOOK', 'GOOGLE', 'TIKTOK', 'TELEGRAM']
  if (!validSources.includes(body.source)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid source. Must be one of: FACEBOOK, GOOGLE, TIKTOK, TELEGRAM'
    })
  }

  const statistic = await prisma.statistic.create({
    data: {
      date: new Date(body.date),
      source: body.source,
      geo: body.geo,
      offer: body.offer,
      creative: body.creative,
      leads: parseInt(body.leads) || 0,
      spend: parseFloat(body.spend) || 0,
      ftd: parseInt(body.ftd) || 0,
      revenue: parseFloat(body.revenue) || 0,
      // Telegram-specific fields (CPC/CPA рассчитываются на клиенте)
      subscribers: body.source === 'TELEGRAM' ? (parseInt(body.subscribers) || null) : null,
      clicks: body.source === 'TELEGRAM' ? (parseInt(body.clicks) || null) : null,
      userId: session.userId
    }
  })

  return { success: true, statistic }
})
