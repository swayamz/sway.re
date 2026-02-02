import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSiteAdmin, hasBoardAccess, getUserRole } from '@/lib/auth-utils'

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

    // Check if user has access to this timerboard (individual or corporation-based)
    const hasAccess = await hasBoardAccess(userId, timerboardId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 })
    }

    // Get the timerboard details
    const timerboard = await prisma.timerboard.findUnique({
      where: { id: timerboardId },
    })

    if (!timerboard) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 })
    }

    // Get user's effective role (considering both individual and corporation access)
    const userRole = await getUserRole(userId, timerboardId)

    // Get all timers (including expired ones for past timers view)
    const timers = await prisma.timer.findMany({
      where: {
        timerboardId,
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
        id: timerboard.id,
        name: timerboard.name,
        description: timerboard.description,
        userRole: userRole || 'USER',
      },
      timers: timers.map((timer: any) => ({
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
        isExpired: timer.isExpired,
        isDestroyed: timer.isDestroyed,
        zkillboardId: timer.zkillboardId,
        addedBy: timer.addedByUser.characterName,
        createdAt: timer.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const timerboardId = params.id

    // Check if user is a site admin (only admins can delete timerboards)
    const isAdmin = await isSiteAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Only site administrators can delete timerboards' 
      }, { status: 403 })
    }

    // Get timerboard details for audit log
    const timerboard = await prisma.timerboard.findUnique({
      where: { id: timerboardId },
      include: {
        _count: {
          select: {
            timers: true,
            users: true,
          },
        },
      },
    })

    if (!timerboard) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 })
    }

    // Create audit log entry before deletion
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TIMERBOARD_DELETED',
        details: JSON.stringify({
          timerboardId,
          name: timerboard.name,
          description: timerboard.description,
          timerCount: timerboard._count.timers,
          userCount: timerboard._count.users,
          deletedAt: new Date().toISOString(),
        }),
      },
    })

    // Delete timerboard (cascade will delete associated timers, users, and audit logs)
    await prisma.timerboard.delete({
      where: { id: timerboardId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Timerboard deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}