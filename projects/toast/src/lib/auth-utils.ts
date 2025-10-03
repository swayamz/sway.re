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

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })
  return user?.isAdmin || false
}