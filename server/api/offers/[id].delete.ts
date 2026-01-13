import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  
  // Only ADMIN can delete offers
  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Only admin can delete offers' })
  }

  const id = parseInt(event.context.params?.id as string)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid offer ID' })
  }

  // Soft delete - just deactivate
  await prisma.offer.update({
    where: { id },
    data: { isActive: false }
  })

  return { success: true }
})
