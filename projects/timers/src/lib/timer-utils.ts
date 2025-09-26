import { prisma } from '@/lib/prisma'

export interface DuplicateCheckParams {
  timerboardId: string
  structureType: string
  system: string
  location: string
  owner: string
  layer?: string | null
  expiresAt: Date
  toleranceMinutes?: number
}

export interface DuplicateTimer {
  id: string
  structureType: string
  system: string
  location: string
  owner: string
  layer: string | null
  expiresAt: Date
  addedBy: string
  createdAt: Date
}

export const DEFAULT_TIME_TOLERANCE_MINUTES = 30

export async function checkForDuplicateTimer({
  timerboardId,
  structureType,
  system,
  location,
  owner,
  layer = null,
  expiresAt,
  toleranceMinutes = DEFAULT_TIME_TOLERANCE_MINUTES
}: DuplicateCheckParams): Promise<DuplicateTimer | null> {
  const toleranceMs = toleranceMinutes * 60 * 1000
  const earliestTime = new Date(expiresAt.getTime() - toleranceMs)
  const latestTime = new Date(expiresAt.getTime() + toleranceMs)

  const existingTimer = await prisma.timer.findFirst({
    where: {
      timerboardId,
      structureType,
      system,
      location,
      owner,
      layer,
      expiresAt: {
        gte: earliestTime,
        lte: latestTime
      },
      // Only check non-expired timers
      isExpired: false
    },
    select: {
      id: true,
      structureType: true,
      system: true,
      location: true,
      owner: true,
      layer: true,
      expiresAt: true,
      addedBy: true,
      createdAt: true
    }
  })

  return existingTimer
}

export function formatDuplicateMessage(duplicate: DuplicateTimer, timeDifference: number): string {
  const absTimeDiff = Math.abs(timeDifference)
  const hours = Math.floor(absTimeDiff / (1000 * 60 * 60))
  const minutes = Math.floor((absTimeDiff % (1000 * 60 * 60)) / (1000 * 60))

  let timeDiffText = ''
  if (hours > 0) {
    timeDiffText = `${hours}h ${minutes}m`
  } else {
    timeDiffText = `${minutes}m`
  }

  const direction = timeDifference > 0 ? 'later' : 'earlier'
  const existingTimerUTC = duplicate.expiresAt.toISOString().replace('T', ' ').replace('.000Z', ' UTC')

  return `A similar timer already exists for ${duplicate.structureType} in ${duplicate.system} (${duplicate.location}) owned by ${duplicate.owner}. The existing timer expires ${timeDiffText} ${direction} than the one you're trying to add at ${existingTimerUTC}.`
}