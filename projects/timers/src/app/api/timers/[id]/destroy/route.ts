import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canRepairTimer } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).userId
    const timerId = params.id
    const { zkillboardLink } = await request.json()

    // Validate zkillboard link and extract ID
    if (!zkillboardLink) {
      return NextResponse.json({
        error: 'zkillboard link is required'
      }, { status: 400 })
    }

    // Extract zkillboard ID from URL (e.g., https://zkillboard.com/kill/130099527/)
    const zkillboardMatch = zkillboardLink.match(/zkillboard\.com\/kill\/(\d+)\/?/)
    if (!zkillboardMatch) {
      return NextResponse.json({
        error: 'Invalid zkillboard link format. Expected: https://zkillboard.com/kill/[ID]/'
      }, { status: 400 })
    }

    const zkillboardId = zkillboardMatch[1]

    // Get the timer to validate it exists and user has permission
    const timer = await prisma.timer.findUnique({
      where: { id: timerId },
      include: { timerboard: true }
    })

    if (!timer) {
      return NextResponse.json({ error: 'Timer not found' }, { status: 404 })
    }

    // Check if user has permission to destroy timers on this timerboard (moderator or admin only)
    const hasPermission = await canRepairTimer(userId, timer.timerboardId)
    if (!hasPermission) {
      return NextResponse.json({
        error: 'You do not have permission to destroy timers on this timerboard. Only moderators and admins can destroy timers.'
      }, { status: 403 })
    }

    // Check if timer is not already destroyed
    if (timer.isDestroyed) {
      return NextResponse.json({
        error: 'Timer is already marked as destroyed'
      }, { status: 400 })
    }

    // Check if timer is active or past (not future)
    const now = new Date()
    const expiresAt = new Date(timer.expiresAt)

    if (expiresAt > now) {
      return NextResponse.json({
        error: 'Can only mark active or past timers as destroyed'
      }, { status: 400 })
    }

    // Mark timer as destroyed
    await prisma.timer.update({
      where: { id: timerId },
      data: {
        isDestroyed: true,
        isExpired: true,
        zkillboardId,
        activeUntil: timer.activeUntil < now ? timer.activeUntil : now, // Set active until to now to move it to past timers
      }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId: timer.timerboardId,
        userId,
        action: 'TIMER_DESTROYED',
        details: JSON.stringify({
          timerId,
          structureType: timer.structureType,
          system: timer.system,
          location: timer.location,
          zkillboardId,
          zkillboardLink,
          destroyedAt: now.toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Timer marked as destroyed',
      zkillboardId
    })
  } catch (error) {
    console.error('Error destroying timer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}