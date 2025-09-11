import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAddTimer } from '@/lib/auth-utils'
import { getSystemRegion } from '@/lib/esi'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).userId
    const body = await request.json()
    
    const { 
      timerboardId, 
      structureType, 
      system, 
      location, 
      owner, 
      layer, 
      expiresAt, 
      notes 
    } = body

    // Validate required fields
    if (!timerboardId || !structureType || !system || !location || !owner || !expiresAt) {
      return NextResponse.json({ 
        error: 'Missing required fields: timerboardId, structureType, system, location, owner, expiresAt' 
      }, { status: 400 })
    }

    // Check if user has permission to add timers to this timerboard
    const hasPermission = await canAddTimer(userId, timerboardId)
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to add timers to this timerboard' 
      }, { status: 403 })
    }

    // Fetch region data from EVE Online ESI
    const region = await getSystemRegion(system)
    console.log(region)

    // Calculate active window based on structure type
    let activeUntil = null
    const expiryDate = new Date(expiresAt)
    
    switch (structureType) {
      case 'ORBITAL_SKYHOOK':
        activeUntil = new Date(expiryDate.getTime() + 15 * 60 * 1000) // 15 minutes
        break
      case 'JUMP_BRIDGE':
      case 'MERCENARY_DEN':
        activeUntil = new Date(expiryDate.getTime() + 30 * 60 * 1000) // 30 minutes
        break
      case 'ASTRAHUS':
      case 'ATHANOR':
      case 'TATARA':
      case 'FORTIZAR':
      case 'AZBEL':
      case 'SOTIYO':
      case 'KEEPSTAR':
      case 'METENOX':
        activeUntil = new Date(expiryDate.getTime() + 15 * 60 * 1000) // 15 minutes
        break
    }

    // Create timer
    const timer = await prisma.timer.create({
      data: {
        timerboardId,
        structureType,
        system,
        region,
        location,
        owner,
        layer: layer || null,
        expiresAt: expiryDate,
        activeUntil,
        notes: notes || null,
        addedBy: userId,
      },
      include: {
        addedByUser: {
          select: {
            characterName: true,
          },
        },
      },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        timerboardId,
        userId,
        action: 'TIMER_ADDED',
        details: JSON.stringify({
          timerId: timer.id,
          structureType,
          system,
          location,
          owner,
          expiresAt: expiryDate.toISOString(),
        }),
      },
    })

    return NextResponse.json({
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
      addedBy: timer.addedByUser.characterName,
      createdAt: timer.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating timer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}