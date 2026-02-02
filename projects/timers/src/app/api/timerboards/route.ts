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

    // Get user's corporation ID for corporation-based access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { corporationId: true },
    })

    // Get all timerboards the user has direct access to
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

    // Get timerboards accessible via corporation membership
    let corpTimerboards: any[] = []
    if (user?.corporationId) {
      const corpAccess = await prisma.timerboardCorporation.findMany({
        where: {
          corporationId: user.corporationId,
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

      corpTimerboards = corpAccess.map((ct: any) => ({
        id: ct.timerboard.id,
        name: ct.timerboard.name,
        description: ct.timerboard.description,
        role: ct.role,
        timerCount: ct.timerboard._count.timers,
        createdAt: ct.timerboard.createdAt,
        accessType: 'corporation',
      }))
    }

    // Map individual access timerboards
    const individualTimerboards = userTimerboards.map((ut: any) => ({
      id: ut.timerboard.id,
      name: ut.timerboard.name,
      description: ut.timerboard.description,
      role: ut.role,
      timerCount: ut.timerboard._count.timers,
      createdAt: ut.timerboard.createdAt,
      accessType: 'individual',
    }))

    // Merge and deduplicate, preferring higher role
    const timerboardMap = new Map<string, any>()
    const roleHierarchy: Record<string, number> = {
      'ADMIN': 3,
      'MODERATOR': 2,
      'USER': 1,
    }

    // Add individual access first
    for (const tb of individualTimerboards) {
      timerboardMap.set(tb.id, tb)
    }

    // Add corporation access, merging roles if board already exists
    for (const tb of corpTimerboards) {
      const existing = timerboardMap.get(tb.id)
      if (existing) {
        // Keep the higher role
        if (roleHierarchy[tb.role] > roleHierarchy[existing.role]) {
          existing.role = tb.role
        }
        // Mark as having both access types
        existing.accessType = 'both'
      } else {
        timerboardMap.set(tb.id, tb)
      }
    }

    const timerboards = Array.from(timerboardMap.values())

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