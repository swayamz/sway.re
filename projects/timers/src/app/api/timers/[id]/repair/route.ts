import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAddTimer } from '@/lib/auth-utils'

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

    // Get the timer to validate it exists and user has permission
    const timer = await prisma.timer.findUnique({
      where: { id: timerId },
      include: { timerboard: true }
    })

    if (!timer) {
      return NextResponse.json({ error: 'Timer not found' }, { status: 404 })
    }

    // Check if user has permission to modify timers on this timerboard
    const hasPermission = await canAddTimer(userId, timer.timerboardId)
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to repair timers on this timerboard' 
      }, { status: 403 })
    }

    // Check if timer is currently in active window
    const now = new Date()
    const expiresAt = new Date(timer.expiresAt)
    const activeUntil = timer.activeUntil ? new Date(timer.activeUntil) : null

    if (!activeUntil || !(expiresAt <= now && now <= activeUntil)) {
      return NextResponse.json({ 
        error: 'Timer is not currently in active repair window' 
      }, { status: 400 })
    }

    // Check if timer type supports manual repair (Jump Bridge or Mercenary Den)
    if (timer.structureType !== 'JUMP_BRIDGE' && timer.structureType !== 'MERCENARY_DEN') {
      return NextResponse.json({ 
        error: 'This timer type does not support manual repair' 
      }, { status: 400 })
    }

    // Mark timer as expired to move it to past timers
    await prisma.timer.update({
      where: { id: timerId },
      data: {
        isExpired: true,
        activeUntil: now, // Set active until to now to mark as repaired
      }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId: timer.timerboardId,
        userId,
        action: 'TIMER_REPAIRED',
        details: JSON.stringify({
          timerId,
          structureType: timer.structureType,
          system: timer.system,
          location: timer.location,
          repairedAt: now.toISOString(),
        }),
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Timer marked as repaired' 
    })
  } catch (error) {
    console.error('Error repairing timer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}