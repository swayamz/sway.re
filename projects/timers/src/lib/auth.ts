import { NextAuthOptions } from "next-auth"
import { createOrUpdateUser } from "./auth-utils"

async function getCharacterCorporationId(characterId: number): Promise<number | undefined> {
  try {
    const response = await fetch(
      `https://esi.evetech.net/latest/characters/${characterId}/`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Sway-Timers-App/1.0',
        },
      }
    )
    if (response.ok) {
      const data = await response.json()
      return data.corporation_id
    }
  } catch (error) {
    console.error('Error fetching character corporation:', error)
  }
  return undefined
}

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
        const characterId = (profile as any).CharacterID
        token.characterId = characterId
        token.characterName = (profile as any).CharacterName

        // Fetch corporation ID from ESI (not provided by SSO verify endpoint)
        const corporationId = await getCharacterCorporationId(characterId)
        token.corporationId = corporationId

        // Create or update user in database
        try {
          const user = await createOrUpdateUser({
            characterId: characterId,
            characterName: (profile as any).CharacterName,
            corporationId: corporationId,
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
  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === "production",
}