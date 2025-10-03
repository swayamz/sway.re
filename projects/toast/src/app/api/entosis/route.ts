import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseEntosisNotifications, enrichWithRegion } from '@/lib/entosis-parser'
import { getSystemRegionsBulk } from '@/lib/esi'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get entosis events from the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)

    const events = await prisma.entosisEvent.findMany({
      where: {
        timestamp: {
          gte: sixHoursAgo
        }
      },
      include: {
        importedByUser: {
          select: {
            characterName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    // Enrich events with markedBy user information
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let markedByUser = null
        if (event.markedBy) {
          const user = await prisma.user.findUnique({
            where: { id: event.markedBy },
            select: { characterName: true }
          })
          markedByUser = user
        }

        return {
          ...event,
          markedByUser
        }
      })
    )

    return NextResponse.json({ events: enrichedEvents })
  } catch (error) {
    console.error('Error fetching entosis events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mailText } = body

    if (!mailText || typeof mailText !== 'string') {
      return NextResponse.json({ error: 'mailText is required' }, { status: 400 })
    }

    // Parse the notifications
    const result = parseEntosisNotifications(mailText)

    if (result.parsed.length === 0) {
      return NextResponse.json({
        error: 'No valid entosis notifications found',
        errors: result.errors
      }, { status: 400 })
    }

    // Check for existing notifications and create new ones
    const created = []
    const skipped = []

    // Filter out existing notifications first
    const newNotifications = []
    for (const notification of result.parsed) {
      const existing = await prisma.entosisEvent.findUnique({
        where: { notificationHash: notification.notificationHash }
      })

      if (existing) {
        skipped.push(notification)
      } else {
        newNotifications.push(notification)
      }
    }

    if (newNotifications.length > 0) {
      // Get all unique system names for bulk region lookup
      const uniqueSystems = [...new Set(newNotifications.map(n => n.system))]

      // Bulk fetch region information for all systems
      const systemRegions = await getSystemRegionsBulk(uniqueSystems)

      // Create all events
      for (const notification of newNotifications) {
        const region = systemRegions.get(notification.system) || null

        const event = await prisma.entosisEvent.create({
          data: {
            system: notification.system,
            region: region,
            timestamp: notification.timestamp,
            isReinforced: notification.isReinforced,
            status: 'Being Captured!',
            notificationHash: notification.notificationHash,
            importedBy: (session.user as any).userId,
          }
        })

        created.push(event)
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors: result.errors,
      events: created
    })

  } catch (error) {
    console.error('Error importing entosis events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, status, note } = body

    if (!eventId || !status) {
      return NextResponse.json({ error: 'eventId and status are required' }, { status: 400 })
    }

    const validStatuses = ['Being Captured!', 'On the way', 'Cleared', 'Reset', 'REINFORCED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const event = await prisma.entosisEvent.update({
      where: { id: eventId },
      data: {
        status,
        markedBy: (session.user as any).userId,
        markedAt: new Date(),
        markedNote: note || null,
        lastUpdatedBy: (session.user as any).userId,
        lastUpdatedAt: new Date()
      }
    })

    return NextResponse.json({ event })

  } catch (error) {
    console.error('Error updating entosis event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow user "Sway Re" to delete events
    const user = session.user as any
    if (user.characterName !== 'Sway Re') {
      return NextResponse.json({ error: 'Forbidden: Only an admin can delete events' }, { status: 403 })
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    await prisma.entosisEvent.delete({
      where: { id: eventId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting entosis event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}