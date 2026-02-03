import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchCorporation } from '@/lib/esi'
import { canModerateTimerboard, hasBoardAccess } from '@/lib/auth-utils'

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

    // Check if user has access to this timerboard (direct or corporation-based)
    const hasAccess = await hasBoardAccess(userId, timerboardId)

    if (!hasAccess) {
      return NextResponse.json({
        error: 'Timerboard not found or access denied'
      }, { status: 404 })
    }

    // Get all corporations with access to this timerboard
    const corporations = await prisma.timerboardCorporation.findMany({
      where: {
        timerboardId,
      },
      include: {
        addedByUser: {
          select: {
            characterName: true,
          }
        }
      },
      orderBy: {
        addedAt: 'desc',
      },
    })

    return NextResponse.json({
      corporations: corporations.map((corp) => ({
        id: corp.id,
        corporationId: corp.corporationId,
        corporationName: corp.corporationName,
        role: corp.role,
        addedAt: corp.addedAt.toISOString(),
        addedBy: corp.addedByUser.characterName,
      })),
    })
  } catch (error) {
    console.error('Error fetching timerboard corporations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const timerboardId = params.id
    const { corporationName, role } = await request.json()

    if (!corporationName) {
      return NextResponse.json({
        error: 'Corporation name is required'
      }, { status: 400 })
    }

    // Check if timerboard exists
    const timerboard = await prisma.timerboard.findUnique({
      where: { id: timerboardId },
    })

    if (!timerboard) {
      return NextResponse.json({
        error: 'Timerboard not found'
      }, { status: 404 })
    }

    // Check if user has permission (site admin, or MODERATOR on this timerboard via direct or corporation access)
    const hasPermission = await canModerateTimerboard(userId, timerboardId)

    if (!hasPermission) {
      return NextResponse.json({
        error: 'You do not have permission to add corporations to this timerboard'
      }, { status: 403 })
    }

    // Search for corporation by name using ESI
    const corpInfo = await searchCorporation(corporationName.trim())

    if (!corpInfo) {
      return NextResponse.json({
        error: `Corporation "${corporationName}" not found in EVE Online`
      }, { status: 404 })
    }

    // Check if corporation is already on this timerboard
    const existingCorp = await prisma.timerboardCorporation.findUnique({
      where: {
        timerboardId_corporationId: {
          timerboardId,
          corporationId: corpInfo.id,
        },
      },
    })

    // Validate role
    const validRole = role && ['USER', 'MODERATOR'].includes(role) ? role : 'USER'

    let auditAction = 'CORPORATION_ADDED'
    let successMessage = `Successfully added ${corpInfo.name} to timerboard with ${validRole} role`

    if (existingCorp) {
      // Corporation already exists, update their role
      await prisma.timerboardCorporation.update({
        where: {
          timerboardId_corporationId: {
            timerboardId,
            corporationId: corpInfo.id,
          },
        },
        data: {
          role: validRole,
          corporationName: corpInfo.name, // Update name in case it changed
        },
      })

      auditAction = 'CORPORATION_ROLE_UPDATED'
      successMessage = `Successfully updated ${corpInfo.name}'s role from ${existingCorp.role} to ${validRole}`
    } else {
      // Corporation doesn't exist, create new entry
      await prisma.timerboardCorporation.create({
        data: {
          timerboardId,
          corporationId: corpInfo.id,
          corporationName: corpInfo.name,
          role: validRole,
          addedBy: userId,
        },
      })
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId,
        userId,
        action: auditAction,
        details: JSON.stringify({
          corporationId: corpInfo.id,
          corporationName: corpInfo.name,
          newRole: validRole,
          previousRole: existingCorp?.role,
          updatedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: successMessage,
      corporation: {
        corporationId: corpInfo.id,
        corporationName: corpInfo.name,
        role: validRole,
      }
    })
  } catch (error) {
    console.error('Error adding corporation to timerboard:', error)
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
    const { corporationId } = await request.json()

    if (!corporationId) {
      return NextResponse.json({
        error: 'Corporation ID is required'
      }, { status: 400 })
    }

    // Check if timerboard exists
    const timerboard = await prisma.timerboard.findUnique({
      where: { id: timerboardId },
    })

    if (!timerboard) {
      return NextResponse.json({
        error: 'Timerboard not found'
      }, { status: 404 })
    }

    // Check if user has permission (site admin, or MODERATOR on this timerboard via direct or corporation access)
    const hasPermission = await canModerateTimerboard(userId, timerboardId)

    if (!hasPermission) {
      return NextResponse.json({
        error: 'You do not have permission to remove corporations from this timerboard'
      }, { status: 403 })
    }

    // Check if corporation is on this timerboard
    const corpAccess = await prisma.timerboardCorporation.findUnique({
      where: {
        timerboardId_corporationId: {
          timerboardId,
          corporationId: parseInt(corporationId),
        },
      },
    })

    if (!corpAccess) {
      return NextResponse.json({
        error: 'Corporation is not a member of this timerboard'
      }, { status: 400 })
    }

    // Remove corporation from timerboard
    await prisma.timerboardCorporation.delete({
      where: {
        timerboardId_corporationId: {
          timerboardId,
          corporationId: parseInt(corporationId),
        },
      },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId,
        userId,
        action: 'CORPORATION_REMOVED',
        details: JSON.stringify({
          corporationId: corpAccess.corporationId,
          corporationName: corpAccess.corporationName,
          removedRole: corpAccess.role,
          removedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${corpAccess.corporationName} from timerboard`
    })
  } catch (error) {
    console.error('Error removing corporation from timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
