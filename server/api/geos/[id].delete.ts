import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  
  // Only ADMIN can delete geos
  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Only admin can delete geos' })
  }

  const id = parseInt(event.context.params?.id as string)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid geo ID' })
  }

  // Soft delete - just deactivate
  await prisma.geo.update({
    where: { id },
    data: { isActive: false }
  })

  return { success: true }
})
