import { NextAuthOptions } from "next-auth"
import { createOrUpdateUser } from "./auth-utils"

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "eve-online",
      name: "EVE Online",
      type: "oauth",
      authorization: {
        url: "https://login.eveonline.com/oauth/authorize",
        params: {
          scope: "publicData",
          response_type: "code",
        },
      },
      token: "https://login.eveonline.com/oauth/token",
      userinfo: "https://login.eveonline.com/oauth/verify",
      clientId: process.env.EVE_CLIENT_ID,
      clientSecret: process.env.EVE_CLIENT_SECRET,
      profile(profile: any) {
        return {
          id: profile.CharacterID.toString(),
          name: profile.CharacterName,
          email: null, // EVE Online doesn't provide email
          image: `https://images.evetech.net/characters/${profile.CharacterID}/portrait?size=128`,
        }
      },
    }
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Store additional EVE character data in JWT
      if (account && profile) {
        token.characterId = (profile as any).CharacterID
        token.characterName = (profile as any).CharacterName
        token.corporationId = (profile as any).CorporationID

        // Create or update user in database
        try {
          const user = await createOrUpdateUser({
            characterId: (profile as any).CharacterID,
            characterName: (profile as any).CharacterName,
            corporationId: (profile as any).CorporationID,
          })
          token.userId = user.id
          token.isAdmin = user.isAdmin
        } catch (error) {
          console.error('Error creating/updating user:', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      // Pass character data to session
      if (session.user && token) {
        (session.user as any).characterId = token.characterId
        ;(session.user as any).characterName = token.characterName
        ;(session.user as any).corporationId = token.corporationId
        ;(session.user as any).userId = token.userId
        ;(session.user as any).isAdmin = token.isAdmin
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}