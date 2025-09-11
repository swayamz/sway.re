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
        error: 'You do not have permission to view audit logs' 
      }, { status: 403 })
    }

    // Get audit logs for the timerboard, ordered by most recent first
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        timerboardId,
      },
      include: {
        user: {
          select: {
            characterName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 activities
    })

    // Format the logs for display
    const formattedLogs = auditLogs.map((log: any) => {
      let details
      try {
        details = JSON.parse(log.details)
      } catch {
        details = {}
      }

      return {
        id: log.id,
        action: log.action,
        characterName: log.user.characterName,
        details,
        createdAt: log.createdAt,
      }
    })

    return NextResponse.json({ auditLogs: formattedLogs })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}