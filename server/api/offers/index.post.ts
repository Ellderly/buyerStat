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
  const { name, value } = body

  if (!name || !value) {
    throw createError({ statusCode: 400, message: 'Name and value are required' })
  }

  // Check for duplicates
  const existing = await prisma.offer.findFirst({
    where: {
      OR: [{ name }, { value }]
    }
  })

  if (existing) {
    throw createError({ statusCode: 400, message: 'Оффер с таким названием или значением уже существует' })
  }

  const offer = await prisma.offer.create({
    data: { name, value }
  })

  return { offer }
})
