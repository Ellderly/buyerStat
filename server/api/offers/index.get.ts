import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  // Get all active offers
  const offers = await prisma.offer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  return { offers }
})
