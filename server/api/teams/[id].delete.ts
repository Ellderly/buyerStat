import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Team ID required' })
  }

  const teamId = parseInt(id)

  try {
    // Unlink users first (set teamId to null)
    await prisma.user.updateMany({
      where: { teamId },
      data: { teamId: null }
    })

    // Delete the team
    await prisma.team.delete({
      where: { id: teamId }
    })

    return { success: true }
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Failed to delete team' })
  }
})
