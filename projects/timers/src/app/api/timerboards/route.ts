import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSiteAdmin } from '@/lib/auth-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).userId

    // Get all timerboards the user has access to
    const userTimerboards = await prisma.userTimerboard.findMany({
      where: {
        userId: userId,
      },
      include: {
        timerboard: {
          include: {
            _count: {
              select: {
                timers: {
                  where: {
                    isExpired: false,
                  },
                },
              },
            },
          },
        },
      },
    })

    const timerboards = userTimerboards.map(ut => ({
      id: ut.timerboard.id,
      name: ut.timerboard.name,
      description: ut.timerboard.description,
      role: ut.role,
      timerCount: ut.timerboard._count.timers,
      createdAt: ut.timerboard.createdAt,
    }))

    return NextResponse.json(timerboards)
  } catch (error) {
    console.error('Error fetching timerboards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).userId
    
    // Check if user is a site admin (only admins can create timerboards)
    const isAdmin = await isSiteAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Only site administrators can create timerboards' 
      }, { status: 403 })
    }

    const { name, description } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create new timerboard
    const timerboard = await prisma.timerboard.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: userId,
      },
    })

    // Add creator as admin
    await prisma.userTimerboard.create({
      data: {
        userId: userId,
        timerboardId: timerboard.id,
        role: 'ADMIN',
      },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId: timerboard.id,
        userId,
        action: 'TIMERBOARD_CREATED',
        details: JSON.stringify({
          timerboardId: timerboard.id,
          name: timerboard.name,
          description: timerboard.description,
          createdAt: timerboard.createdAt.toISOString(),
        }),
      },
    })

    return NextResponse.json({
      id: timerboard.id,
      name: timerboard.name,
      description: timerboard.description,
      role: 'ADMIN',
      timerCount: 0,
      createdAt: timerboard.createdAt,
    })
  } catch (error) {
    console.error('Error creating timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}