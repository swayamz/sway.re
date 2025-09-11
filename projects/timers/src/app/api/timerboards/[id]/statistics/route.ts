import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canModerateTimerboard } from '@/lib/auth-utils'

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

    // Check if user has moderator permissions
    const hasPermission = await canModerateTimerboard(userId, timerboardId)
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to view statistics' 
      }, { status: 403 })
    }

    // Get current month boundaries
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Get total timers this month
    const timersThisMonth = await prisma.timer.count({
      where: {
        timerboardId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    // Get total timers all time
    const totalTimers = await prisma.timer.count({
      where: {
        timerboardId,
      },
    })

    // Get active users this month (users who added timers)
    const activeUsers = await prisma.timer.groupBy({
      by: ['addedBy'],
      where: {
        timerboardId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _count: {
        addedBy: true,
      },
    })

    // Get user statistics with character names
    const userStats = await Promise.all(
      activeUsers.map(async (user: any) => {
        const userData = await prisma.user.findUnique({
          where: { id: user.addedBy },
          select: { characterName: true },
        })
        return {
          characterName: userData?.characterName || 'Unknown',
          timerCount: user._count.addedBy,
        }
      })
    )

    // Get structure type breakdown this month
    const structureStats = await prisma.timer.groupBy({
      by: ['structureType'],
      where: {
        timerboardId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _count: {
        structureType: true,
      },
    })

    // Format structure types for display
    const formattedStructureStats = structureStats.map((stat: any) => ({
      structureType: stat.structureType.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, (l: any) => l.toUpperCase()),
      count: stat._count.structureType,
    }))

    return NextResponse.json({
      timersThisMonth,
      totalTimers,
      activeUsersCount: activeUsers.length,
      userStats: userStats.sort((a, b) => b.timerCount - a.timerCount),
      structureStats: formattedStructureStats.sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}