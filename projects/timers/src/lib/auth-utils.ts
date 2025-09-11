import { prisma } from './prisma'

// Role constants since we're using strings instead of enums for SQLite compatibility
export const UserRole = {
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  USER: 'USER',
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

export async function createOrUpdateUser(characterData: {
  characterId: number
  characterName: string
  corporationId?: number
}) {
  const existingUser = await prisma.user.findUnique({
    where: { characterId: characterData.characterId },
  })

  if (existingUser) {
    // Update existing user
    return await prisma.user.update({
      where: { characterId: characterData.characterId },
      data: {
        characterName: characterData.characterName,
        corporationId: characterData.corporationId,
        updatedAt: new Date(),
      },
    })
  } else {
    // Create new user
    return await prisma.user.create({
      data: {
        characterId: characterData.characterId,
        characterName: characterData.characterName,
        corporationId: characterData.corporationId,
        isAdmin: false, // Default to non-admin
      },
    })
  }
}

export async function getUserWithPermissions(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      timerboards: {
        include: {
          timerboard: true,
        },
      },
    },
  })
}

export async function getUserRole(userId: string, timerboardId: string): Promise<UserRoleType | null> {
  const userTimerboard = await prisma.userTimerboard.findUnique({
    where: {
      userId_timerboardId: {
        userId,
        timerboardId,
      },
    },
  })

  return userTimerboard?.role as UserRoleType || null
}

export async function hasPermission(
  userId: string, 
  timerboardId: string, 
  requiredRole: UserRoleType
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  // Site admin has all permissions
  if (user?.isAdmin) return true

  const userRole = await getUserRole(userId, timerboardId)
  if (!userRole) return false

  // Permission hierarchy: ADMIN > MODERATOR > USER
  const roleHierarchy: Record<string, number> = {
    [UserRole.ADMIN]: 3,
    [UserRole.MODERATOR]: 2,
    [UserRole.USER]: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export async function canAddTimer(userId: string, timerboardId: string): Promise<boolean> {
  return await hasPermission(userId, timerboardId, UserRole.USER)
}

export async function canDeleteTimer(userId: string, timerboardId: string): Promise<boolean> {
  return await hasPermission(userId, timerboardId, UserRole.MODERATOR)
}

export async function canModerateTimerboard(userId: string, timerboardId: string): Promise<boolean> {
  return await hasPermission(userId, timerboardId, UserRole.MODERATOR)
}

export async function canManageUsers(userId: string, timerboardId: string): Promise<boolean> {
  return await hasPermission(userId, timerboardId, UserRole.MODERATOR)
}

export async function isSiteAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })
  return user?.isAdmin || false
}

export async function canCreateTimerboards(userId: string): Promise<boolean> {
  return await isSiteAdmin(userId)
}

export async function canAssignModerators(userId: string): Promise<boolean> {
  return await isSiteAdmin(userId)
}

export async function addUserToTimerboard(
  userId: string, 
  timerboardId: string, 
  role: UserRoleType = UserRole.USER
): Promise<boolean> {
  try {
    await prisma.userTimerboard.create({
      data: {
        userId,
        timerboardId,
        role,
      },
    })
    return true
  } catch (error) {
    console.error('Failed to add user to timerboard:', error)
    return false
  }
}

export async function updateUserRole(
  userId: string, 
  timerboardId: string, 
  newRole: UserRoleType
): Promise<boolean> {
  try {
    await prisma.userTimerboard.update({
      where: {
        userId_timerboardId: {
          userId,
          timerboardId,
        },
      },
      data: {
        role: newRole,
      },
    })
    return true
  } catch (error) {
    console.error('Failed to update user role:', error)
    return false
  }
}