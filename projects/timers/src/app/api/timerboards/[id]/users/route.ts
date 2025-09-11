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

    if (existingMembership) {
      return NextResponse.json({ 
        error: `${characterName} is already a member of this timerboard with ${existingMembership.role} role` 
      }, { status: 400 })
    }

    // Add user to timerboard with specified role (default to USER)
    const validRole = role && ['USER', 'MODERATOR'].includes(role) ? role : 'USER'
    
    // Only site admins can assign MODERATOR role
    if (validRole === 'MODERATOR' && !userTimerboard.user.isAdmin) {
      return NextResponse.json({ 
        error: 'Only site administrators can assign moderator roles' 
      }, { status: 403 })
    }

    await prisma.userTimerboard.create({
      data: {
        userId: targetUser.id,
        timerboardId,
        role: validRole,
      },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId,
        userId,
        action: 'USER_ADDED',
        details: JSON.stringify({
          addedUserId: targetUser.id,
          addedUserName: targetUser.characterName,
          role: validRole,
          addedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ 
      success: true,
      message: `Successfully added ${characterName} to timerboard with ${validRole} role`
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

    // Check if user has access to this timerboard
    const userAccess = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId,
        },
      },
    })

    if (!userAccess) {
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
      users: timerboardUsers.map(userTimerboard => ({
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