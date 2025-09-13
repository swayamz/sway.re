interface EsiSystemData {
  constellation_id: number
  name: string
  system_id: number
  position: { x: number; y: number; z: number }
}

interface EsiConstellationData {
  constellation_id: number
  name: string
  position: { x: number; y: number; z: number }
  region_id: number
  systems: number[]
}

interface EsiRegionData {
  constellations: number[]
  description: string
  name: string
  region_id: number
}

interface SovereigntyCampaign {
  campaign_id: number
  structure_id: number
  solar_system_id: number
  constellation_id: number
  event_type: string
  start_time: string
  defender_id?: number
  defender_score?: number
  attackers_score?: number
}

interface UniverseNamesRequest {
  ids: number[]
}

interface UniverseNamesResponse {
  id: number
  name: string
  category: string
}

const systemCache = new Map<string, { region: string; systemId: number }>();
const regionSystemsCache = new Map<string, number[]>();
const constellationRegionCache = new Map<number, string>();

// Cache for sovereignty campaigns with 2-minute TTL
const campaignsCache = new Map<string, { data: SovereigntyCampaign[]; timestamp: number }>();
const CAMPAIGNS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const ESI_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Sway-Timers-App/1.0)',
}

export async function getSystemRegion(systemName: string): Promise<string | null> {
  try {
    // Check cache first
    if (systemCache.has(systemName)) {
      return systemCache.get(systemName)!.region;
    }

    // Step 1: Get system ID from name
    const idsResponse = await fetch('https://esi.evetech.net/universe/ids', {
      method: 'POST',
      headers: ESI_HEADERS,
      body: JSON.stringify([systemName]),
    });

    if (!idsResponse.ok) {
      console.error(`ESI /universe/ids failed: ${idsResponse.status} ${idsResponse.statusText}`);
      return null;
    }

    const idsData = await idsResponse.json();
    const systemId = idsData.systems?.[0]?.id;

    if (!systemId) {
      console.error(`System not found: ${systemName}`);
      return null;
    }

    // Step 2: Get system details
    const systemResponse = await fetch(
      `https://esi.evetech.net/universe/systems/${systemId}`,
      { headers: ESI_HEADERS }
    );

    if (!systemResponse.ok) {
      console.error(`ESI system fetch failed: ${systemResponse.status} ${systemResponse.statusText}`);
      return null;
    }

    const systemData: EsiSystemData = await systemResponse.json();

    // Step 3: Get constellation details
    const constellationResponse = await fetch(
      `https://esi.evetech.net/universe/constellations/${systemData.constellation_id}`,
      { headers: ESI_HEADERS }
    );

    if (!constellationResponse.ok) {
      console.error(`ESI constellation fetch failed: ${constellationResponse.status} ${constellationResponse.statusText}`);
      return null;
    }

    const constellationData: EsiConstellationData = await constellationResponse.json();

    // Step 4: Get region details
    const regionResponse = await fetch(
      `https://esi.evetech.net/universe/regions/${constellationData.region_id}`,
      { headers: ESI_HEADERS }
    );

    if (!regionResponse.ok) {
      console.error(`ESI region fetch failed: ${regionResponse.status} ${regionResponse.statusText}`);
      return null;
    }

    const regionData: EsiRegionData = await regionResponse.json();

    // Cache result
    systemCache.set(systemName, {
      region: regionData.name,
      systemId: systemId,
    });

    return regionData.name;
  } catch (error) {
    console.error('Error fetching system region from ESI:', error);
    return null;
  }
}

export async function getSovereigntyCampaigns(): Promise<SovereigntyCampaign[]> {
  try {
    const cacheKey = 'sovereignty_campaigns';
    const now = Date.now();
    
    // Check cache first
    if (campaignsCache.has(cacheKey)) {
      const cached = campaignsCache.get(cacheKey)!;
      if (now - cached.timestamp < CAMPAIGNS_CACHE_TTL) {
        return cached.data;
      }
    }

    const response = await fetch('https://esi.evetech.net/latest/sovereignty/campaigns/?datasource=tranquility', {
      headers: ESI_HEADERS,
    });

    if (!response.ok) {
      console.error(`ESI sovereignty campaigns failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const campaigns: SovereigntyCampaign[] = await response.json();
    
    // Cache the result
    campaignsCache.set(cacheKey, { data: campaigns, timestamp: now });
    
    return campaigns;
  } catch (error) {
    console.error('Error fetching sovereignty campaigns from ESI:', error);
    return [];
  }
}

export async function getUniverseNames(ids: number[]): Promise<UniverseNamesResponse[]> {
  try {
    if (ids.length === 0) return [];

    const response = await fetch('https://esi.evetech.net/latest/universe/names/', {
      method: 'POST',
      headers: ESI_HEADERS,
      body: JSON.stringify(ids),
    });

    if (!response.ok) {
      console.error(`ESI universe names failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const names: UniverseNamesResponse[] = await response.json();
    return names;
  } catch (error) {
    console.error('Error fetching universe names from ESI:', error);
    return [];
  }
}

export async function getConstellationRegion(constellationId: number): Promise<string | null> {
  try {
    // Check cache first
    if (constellationRegionCache.has(constellationId)) {
      return constellationRegionCache.get(constellationId)!;
    }

    // Get constellation details
    const constellationResponse = await fetch(
      `https://esi.evetech.net/universe/constellations/${constellationId}`,
      { headers: ESI_HEADERS }
    );

    if (!constellationResponse.ok) {
      console.error(`ESI constellation fetch failed: ${constellationResponse.status} ${constellationResponse.statusText}`);
      return null;
    }

    const constellationData: EsiConstellationData = await constellationResponse.json();

    // Get region details
    const regionResponse = await fetch(
      `https://esi.evetech.net/universe/regions/${constellationData.region_id}`,
      { headers: ESI_HEADERS }
    );

    if (!regionResponse.ok) {
      console.error(`ESI region fetch failed: ${regionResponse.status} ${regionResponse.statusText}`);
      return null;
    }

    const regionData: EsiRegionData = await regionResponse.json();

    // Cache result
    constellationRegionCache.set(constellationId, regionData.name);

    return regionData.name;
  } catch (error) {
    console.error('Error fetching constellation region from ESI:', error);
    return null;
  }
}

export async function getRegionSystems(regionName: string): Promise<number[]> {
  try {
    // Check cache first
    if (regionSystemsCache.has(regionName)) {
      return regionSystemsCache.get(regionName)!;
    }

    // Get region ID from name
    const regionNamesResponse = await fetch('https://esi.evetech.net/universe/ids', {
      method: 'POST',
      headers: ESI_HEADERS,
      body: JSON.stringify([regionName]),
    });

    if (!regionNamesResponse.ok) {
      console.error(`ESI region names failed: ${regionNamesResponse.status} ${regionNamesResponse.statusText}`);
      return [];
    }

    const regionData = await regionNamesResponse.json();
    const regionId = regionData.regions?.[0]?.id;

    if (!regionId) {
      console.error(`Region not found: ${regionName}`);
      return [];
    }

    // Get region details to get constellations
    const regionDetailsResponse = await fetch(`https://esi.evetech.net/universe/regions/${regionId}`, {
      headers: ESI_HEADERS,
    });

    if (!regionDetailsResponse.ok) {
      console.error(`ESI region details failed: ${regionDetailsResponse.status} ${regionDetailsResponse.statusText}`);
      return [];
    }

    const regionDetails: EsiRegionData = await regionDetailsResponse.json();
    
    // Get all systems from all constellations in the region
    // Use Promise.all for parallel API calls to improve performance
    const constellationPromises = regionDetails.constellations.map(async (constellationId) => {
      try {
        const constellationResponse = await fetch(`https://esi.evetech.net/universe/constellations/${constellationId}`, {
          headers: ESI_HEADERS,
        });
        
        if (constellationResponse.ok) {
          const constellationData: EsiConstellationData = await constellationResponse.json();
          return constellationData.systems;
        }
        return [];
      } catch (error) {
        console.error(`Error fetching constellation ${constellationId}:`, error);
        return [];
      }
    });

    const constellationSystems = await Promise.all(constellationPromises);
    const allSystems: number[] = constellationSystems.flat();

    // Cache result
    regionSystemsCache.set(regionName, allSystems);
    return allSystems;
  } catch (error) {
    console.error('Error fetching region systems from ESI:', error);
    return [];
  }
}
