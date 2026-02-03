import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] })
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        characterName: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        characterId: true,
        characterName: true,
      },
      take: 10,
      orderBy: {
        characterName: 'asc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
  }
}
