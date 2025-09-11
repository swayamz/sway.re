// EVE Online ESI API integration for system and region data
// https://developers.eveonline.com/api-explorer

interface EsiSystemData {
  system_id: number
  name: string
  constellation_id: number
  star_id: number
  planets?: any[]
}

interface EsiRegionData {
  region_id: number
  name: string
  description?: string
  constellations: number[]
}

interface EsiConstellationData {
  constellation_id: number
  name: string
  region_id: number
  systems: number[]
}

// Cache to avoid repeated API calls
const systemCache = new Map<string, { region: string, systemId: number }>()

export async function getSystemRegion(systemName: string): Promise<string | null> {
  try {
    // Check cache first
    if (systemCache.has(systemName)) {
      return systemCache.get(systemName)!.region
    }

    // Search for system by name
    const searchUrl = `https://esi.evetech.net/solar_system/${encodeURIComponent(systemName)}/search`

    const searchResponse = await fetch(searchUrl)
    
    if (!searchResponse.ok) {
      console.error(`ESI search failed: ${searchResponse.status} ${searchResponse.statusText}`)
      return null
    }

    const searchData = await searchResponse.json()
    
    if (!searchData.solar_system || searchData.solar_system.length === 0) {
      console.error(`System not found: ${systemName}`)
      return null
    }

    const systemId = searchData.solar_system[0]

    // Get system details
    const systemUrl = `https://esi.evetech.net/latest/universe/systems/${systemId}/`
    const systemResponse = await fetch(systemUrl)
    
    if (!systemResponse.ok) {
      console.error(`ESI system fetch failed: ${systemResponse.status} ${systemResponse.statusText}`)
      return null
    }

    const systemData: EsiSystemData = await systemResponse.json()

    // Get constellation details to find region
    const constellationUrl = `https://esi.evetech.net/latest/universe/constellations/${systemData.constellation_id}/`
    const constellationResponse = await fetch(constellationUrl)
    
    if (!constellationResponse.ok) {
      console.error(`ESI constellation fetch failed: ${constellationResponse.status} ${constellationResponse.statusText}`)
      return null
    }

    const constellationData: EsiConstellationData = await constellationResponse.json()

    // Get region name
    const regionUrl = `https://esi.evetech.net/latest/universe/regions/${constellationData.region_id}/`
    const regionResponse = await fetch(regionUrl)
    
    if (!regionResponse.ok) {
      console.error(`ESI region fetch failed: ${regionResponse.status} ${regionResponse.statusText}`)
      return null
    }

    const regionData: EsiRegionData = await regionResponse.json()

    // Cache the result
    systemCache.set(systemName, { 
      region: regionData.name, 
      systemId: systemId 
    })

    return regionData.name
  } catch (error) {
    console.error('Error fetching system region from ESI:', error)
    return null
  }
}