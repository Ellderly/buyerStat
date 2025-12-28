import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Prevent self-deletion
  if (session.userId === id) {
    throw createError({ statusCode: 400, message: 'Cannot delete yourself' })
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Delete user's statistics first
  await prisma.statistic.deleteMany({ where: { userId: id } })
  
  // Delete user
  await prisma.user.delete({ where: { id } })

  return { success: true }
})
