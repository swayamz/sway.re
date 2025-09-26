import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAddTimer } from '@/lib/auth-utils'
import { getSystemRegion } from '@/lib/esi'
import { checkForDuplicateTimer, formatDuplicateMessage } from '@/lib/timer-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).userId
    const body = await request.json()
    const url = new URL(request.url)
    const forceDuplicate = url.searchParams.get('force') === 'true'
    
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

    // Check for duplicate timers (unless forcing)
    const expiryDate = new Date(expiresAt)
    if (!forceDuplicate) {
      console.log('Checking for duplicate timer:', {
        timerboardId,
        structureType,
        system,
        location,
        owner,
        layer: layer || null,
        expiresAt: expiryDate
      })

      try {
        const duplicateTimer = await checkForDuplicateTimer({
          timerboardId,
          structureType,
          system,
          location,
          owner,
          layer: layer || null,
          expiresAt: expiryDate
        })

        console.log('Duplicate check result:', duplicateTimer)

        if (duplicateTimer) {
          const timeDifference = expiryDate.getTime() - duplicateTimer.expiresAt.getTime()
          const message = formatDuplicateMessage(duplicateTimer, timeDifference)

          console.log('Duplicate timer found, returning error')
          return NextResponse.json({
            error: 'DUPLICATE_TIMER',
            message,
            existingTimer: {
              id: duplicateTimer.id,
              expiresAt: duplicateTimer.expiresAt.toISOString(),
              createdAt: duplicateTimer.createdAt.toISOString()
            }
          }, { status: 409 })
        }

        console.log('No duplicate found, proceeding with timer creation')
      } catch (error) {
        console.error('Error during duplicate check:', error)
        // If duplicate check fails, we should still prevent creation for safety
        return NextResponse.json({
          error: 'Unable to verify if timer is duplicate. Please try again.',
        }, { status: 500 })
      }
    }

    // Calculate active window based on structure type
    let activeUntil = null
    
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
      case 'RAITARU':
      case 'FORTIZAR':
      case 'AZBEL':
      case 'SOTIYO':
      case 'KEEPSTAR':
      case 'METENOX':
        // For structures with layers, HULL has 30 min window, others have 15 min
        if (layer === 'HULL') {
          activeUntil = new Date(expiryDate.getTime() + 30 * 60 * 1000) // 30 minutes for HULL
        } else {
          activeUntil = new Date(expiryDate.getTime() + 15 * 60 * 1000) // 15 minutes for ARMOR/ANCHORING
        }
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