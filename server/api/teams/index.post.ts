import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')
  const body = await readBody(event)

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Team name is required' })
  }

  const team = await prisma.team.create({
    data: { name: body.name }
  })

  return { success: true, team }
})
