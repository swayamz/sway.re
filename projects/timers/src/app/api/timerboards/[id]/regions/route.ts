import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timerboardId = params.id;

    const userTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId: (session.user as any).userId,
          timerboardId: timerboardId,
        },
      },
      include: {
        timerboard: true,
      },
    });

    if (!userTimerboard) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 });
    }

    return NextResponse.json({ regions: userTimerboard.timerboard.regions });
  } catch (error) {
    console.error('Error fetching timerboard regions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timerboardId = params.id;
    const { regions } = await request.json();

    if (!Array.isArray(regions)) {
      return NextResponse.json({ error: 'Regions must be an array' }, { status: 400 });
    }

    const userTimerboard = await prisma.userTimerboard.findUnique({
      where: {
        userId_timerboardId: {
          userId: (session.user as any).userId,
          timerboardId: timerboardId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!userTimerboard) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 });
    }

    if (userTimerboard.role !== 'MODERATOR' && !userTimerboard.user.isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const updatedTimerboard = await prisma.timerboard.update({
      where: { id: timerboardId },
      data: { regions },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).userId,
        timerboardId: timerboardId,
        action: 'UPDATE_REGIONS',
        details: JSON.stringify({
          regions,
          characterName: (session.user as any).characterName,
        }),
      },
    });

    return NextResponse.json({ regions: updatedTimerboard.regions });
  } catch (error) {
    console.error('Error updating timerboard regions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}