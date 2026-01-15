import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  
  // Only ADMIN and TEAMLEAD can add offers
  if (session.role !== 'ADMIN' && session.role !== 'TEAMLEAD') {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const body = await readBody(event)
  const { name } = body

  if (!name) {
    throw createError({ statusCode: 400, message: 'Название обязательно' })
  }

  // Check for duplicates
  const existing = await prisma.offer.findFirst({
    where: { name }
  })

  if (existing) {
    throw createError({ statusCode: 400, message: 'Оффер с таким названием уже существует' })
  }

  // Use name as value
  const offer = await prisma.offer.create({
    data: { name, value: name }
  })

  return { offer }
})
