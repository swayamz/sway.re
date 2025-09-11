import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).userId
    const timerboardId = params.id

    // Check if userId is available (user properly authenticated)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication incomplete - please sign in again' }, { status: 401 })
    }

    // Check if user has access to this timerboard
    const userTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId,
        },
      },
      include: {
        timerboard: true,
      },
    })

    if (!userTimerboard) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 })
    }

    // Get upcoming timers
    const timers = await prisma.timer.findMany({
      where: {
        timerboardId,
        isExpired: false,
      },
      include: {
        addedByUser: {
          select: {
            characterName: true,
          },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    })

    return NextResponse.json({
      timerboard: {
        id: userTimerboard.timerboard.id,
        name: userTimerboard.timerboard.name,
        description: userTimerboard.timerboard.description,
        userRole: userTimerboard.role,
      },
      timers: timers.map(timer => ({
        id: timer.id,
        structureType: timer.structureType,
        system: timer.system,
        region: timer.region,
        location: timer.location,
        owner: timer.owner,
        layer: timer.layer,
        expiresAt: timer.expiresAt.toISOString(),
        activeUntil: timer.activeUntil?.toISOString(),
        notes: timer.notes,
        isActive: timer.isActive,
        addedBy: timer.addedByUser.characterName,
        createdAt: timer.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}