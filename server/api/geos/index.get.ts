import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  // Get all active geos
  const geos = await prisma.geo.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  return { geos }
})
