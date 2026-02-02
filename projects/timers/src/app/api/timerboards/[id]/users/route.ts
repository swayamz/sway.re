import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { characterName, role } = await request.json()

    if (!characterName) {
      return NextResponse.json({ 
        error: 'Character name is required' 
      }, { status: 400 })
    }

    // Check if current user has permission to add users to this timerboard
    const userTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId,
        },
      },
      include: {
        user: true
      }
    })

    if (!userTimerboard) {
      return NextResponse.json({ 
        error: 'Timerboard not found or access denied' 
      }, { status: 404 })
    }

    // Check if user has permission (ADMIN site-wide, or MODERATOR on this timerboard)
    const hasPermission = userTimerboard.user.isAdmin || userTimerboard.role === 'MODERATOR'
    
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to add users to this timerboard' 
      }, { status: 403 })
    }

    // Find the user by character name
    const targetUser = await prisma.user.findFirst({
      where: {
        characterName: {
          equals: characterName,
          mode: 'insensitive'
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ 
        error: `Character "${characterName}" not found. They must sign in to the application first.` 
      }, { status: 404 })
    }

    // Check if user is already on this timerboard
    const existingMembership = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId: targetUser.id,
          timerboardId,
        },
      },
    })

    // Add user to timerboard with specified role (default to USER)
    const validRole = role && ['USER', 'MODERATOR'].includes(role) ? role : 'USER'
    
    // Site admins can assign any role, moderators can assign MODERATOR or USER roles
    if (validRole === 'MODERATOR' && !userTimerboard.user.isAdmin && userTimerboard.role !== 'MODERATOR') {
      return NextResponse.json({ 
        error: 'Only site administrators and moderators can assign moderator roles' 
      }, { status: 403 })
    }

    let auditAction = 'USER_ADDED'
    let successMessage = `Successfully added ${characterName} to timerboard with ${validRole} role`

    if (existingMembership) {
      // User already exists, update their role
      await prisma.userTimerboard.update({
        where: {
          userId_timerboardId: {
            userId: targetUser.id,
            timerboardId,
          },
        },
        data: {
          role: validRole,
        },
      })

      auditAction = 'USER_ROLE_UPDATED'
      successMessage = `Successfully updated ${characterName}'s role from ${existingMembership.role} to ${validRole}`
    } else {
      // User doesn't exist, create new membership
      await prisma.userTimerboard.create({
        data: {
          userId: targetUser.id,
          timerboardId,
          role: validRole,
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
          targetUserId: targetUser.id,
          targetUserName: targetUser.characterName,
          newRole: validRole,
          previousRole: existingMembership?.role,
          updatedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ 
      success: true,
      message: successMessage
    })
  } catch (error) {
    console.error('Error adding user to timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to list users on a timerboard
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

    // Get user's corporation for corporation-based access check
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { corporationId: true },
    })

    // Check if user has direct access to this timerboard
    const userAccess = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId,
        },
      },
    })

    // Check if user has corporation-based access
    let hasCorporationAccess = false
    if (currentUser?.corporationId) {
      const corpAccess = await prisma.timerboardCorporation.findUnique({
        where: {
          timerboardId_corporationId: {
            timerboardId,
            corporationId: currentUser.corporationId,
          },
        },
      })
      hasCorporationAccess = !!corpAccess
    }

    if (!userAccess && !hasCorporationAccess) {
      return NextResponse.json({
        error: 'Timerboard not found or access denied'
      }, { status: 404 })
    }

    // Get all users on this timerboard
    const timerboardUsers = await prisma.userTimerboard.findMany({
      where: {
        timerboardId,
      },
      include: {
        user: {
          select: {
            characterName: true,
            isAdmin: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'desc',
      },
    })

    return NextResponse.json({
      users: timerboardUsers.map((userTimerboard: any) => ({
        characterName: userTimerboard.user.characterName,
        role: userTimerboard.role,
        isAdmin: userTimerboard.user.isAdmin,
        joinedAt: userTimerboard.joinedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching timerboard users:', error)
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
    const { characterName } = await request.json()

    if (!characterName) {
      return NextResponse.json({ 
        error: 'Character name is required' 
      }, { status: 400 })
    }

    // Check if current user has permission to remove users from this timerboard
    const userTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId,
        },
      },
      include: {
        user: true
      }
    })

    if (!userTimerboard) {
      return NextResponse.json({ 
        error: 'Timerboard not found or access denied' 
      }, { status: 404 })
    }

    // Check if user has permission (ADMIN site-wide, or MODERATOR on this timerboard)
    const hasPermission = userTimerboard.user.isAdmin || userTimerboard.role === 'MODERATOR'
    
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to remove users from this timerboard' 
      }, { status: 403 })
    }

    // Find the user to be removed by character name
    const targetUser = await prisma.user.findFirst({
      where: {
        characterName: {
          equals: characterName,
          mode: 'insensitive'
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ 
        error: `Character "${characterName}" not found` 
      }, { status: 404 })
    }

    // Check if user is on this timerboard
    const targetUserTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId: targetUser.id,
          timerboardId,
        },
      },
    })

    if (!targetUserTimerboard) {
      return NextResponse.json({ 
        error: `${characterName} is not a member of this timerboard` 
      }, { status: 400 })
    }

    // Prevent removing site admins (unless remover is also site admin)
    if (targetUser.isAdmin && !userTimerboard.user.isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot remove site administrators' 
      }, { status: 403 })
    }

    // Prevent users from removing themselves
    if (targetUser.id === userId) {
      return NextResponse.json({ 
        error: 'Cannot remove yourself from the timerboard' 
      }, { status: 400 })
    }

    // Remove user from timerboard
    await prisma.userTimerboard.delete({
      where: {
        userId_timerboardId: {
          userId: targetUser.id,
          timerboardId,
        },
      },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId,
        userId,
        action: 'USER_REMOVED',
        details: JSON.stringify({
          removedUserId: targetUser.id,
          removedUserName: targetUser.characterName,
          removedUserRole: targetUserTimerboard.role,
          removedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ 
      success: true,
      message: `Successfully removed ${characterName} from timerboard`
    })
  } catch (error) {
    console.error('Error removing user from timerboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}