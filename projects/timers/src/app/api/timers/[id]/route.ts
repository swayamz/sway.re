import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAddTimer } from '@/lib/auth-utils'

export async function DELETE(
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

    // Get the timer to validate it exists and user has permission
    const timer = await prisma.timer.findUnique({
      where: { id: timerId },
      include: { timerboard: true }
    })

    if (!timer) {
      return NextResponse.json({ error: 'Timer not found' }, { status: 404 })
    }

    // Check if user has permission to delete timers on this timerboard
    // For deletion, we need at least moderator permissions
    const userTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId: timer.timerboardId,
        },
      },
      include: {
        user: true
      }
    })

    if (!userTimerboard) {
      return NextResponse.json({ 
        error: 'You do not have access to this timerboard' 
      }, { status: 403 })
    }

    // Check if user has appropriate role (ADMIN site-wide, or MODERATOR on this timerboard)
    const hasDeletePermission = userTimerboard.user.isAdmin || userTimerboard.role === 'MODERATOR'
    
    if (!hasDeletePermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to delete timers on this timerboard' 
      }, { status: 403 })
    }

    // Delete the timer (this will NOT move it to past timers - permanent deletion)
    await prisma.timer.delete({
      where: { id: timerId }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId: timer.timerboardId,
        userId,
        action: 'TIMER_DELETED',
        details: JSON.stringify({
          timerId,
          structureType: timer.structureType,
          system: timer.system,
          location: timer.location,
          owner: timer.owner,
          expiresAt: timer.expiresAt.toISOString(),
          deletedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Timer deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting timer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}