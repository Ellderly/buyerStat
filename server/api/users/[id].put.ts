import bcrypt from 'bcrypt'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  const cookie = getCookie(event, 'auth_session')
  const body = await readBody(event)

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)

  if (session.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Prepare update data
  const updateData: any = {}
  if (body.name) updateData.name = body.name
  if (body.username) updateData.username = body.username
  if (body.role) updateData.role = body.role
  if (body.teamId !== undefined) updateData.teamId = body.teamId
  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 10)
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { team: true }
  })

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team?.name
    }
  }
})
