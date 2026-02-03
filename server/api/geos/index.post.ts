import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'auth_session')

  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const session = JSON.parse(cookie)
  
  // Only ADMIN and TEAMLEAD can add geos
  if (session.role !== 'ADMIN' && session.role !== 'TEAMLEAD') {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const body = await readBody(event)
  const { name, code } = body

  if (!name) {
    throw createError({ statusCode: 400, message: 'Название обязательно' })
  }

  // Check for duplicates
  const existing = await prisma.geo.findFirst({
    where: { 
      OR: [
        { name },
        { code: code || name }
      ]
    }
  })

  if (existing) {
    throw createError({ statusCode: 400, message: 'GEO с таким названием или кодом уже существует' })
  }

  // Use name as code if code not provided
  const geo = await prisma.geo.create({
    data: { 
      name, 
      code: code || name 
    }
  })

  return { geo }
})
