import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canModerateTimerboard, hasBoardAccess } from '@/lib/auth-utils';

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
    const userId = (session.user as any).userId;

    // Check if user has access to this timerboard (direct or corporation-based)
    const hasAccess = await hasBoardAccess(userId, timerboardId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Timerboard not found or access denied' }, { status: 404 });
    }

    const timerboard = await prisma.timerboard.findUnique({
      where: { id: timerboardId },
      select: { regions: true },
    });

    if (!timerboard) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 });
    }

    return NextResponse.json({ regions: timerboard.regions });
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
    const userId = (session.user as any).userId;
    const { regions } = await request.json();

    if (!Array.isArray(regions)) {
      return NextResponse.json({ error: 'Regions must be an array' }, { status: 400 });
    }

    // Check if timerboard exists
    const timerboardExists = await prisma.timerboard.findUnique({
      where: { id: timerboardId },
    });

    if (!timerboardExists) {
      return NextResponse.json({ error: 'Timerboard not found' }, { status: 404 });
    }

    // Check if user has moderator permission (site admin, or MODERATOR via direct or corporation access)
    const hasPermission = await canModerateTimerboard(userId, timerboardId);

    if (!hasPermission) {
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