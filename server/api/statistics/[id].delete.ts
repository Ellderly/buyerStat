import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
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

  // Check permissions - only admin or owner can delete
  if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
    throw createError({ statusCode: 403, message: 'Permission denied' })
  }

  await prisma.statistic.delete({ where: { id } })

  return { success: true }
})
