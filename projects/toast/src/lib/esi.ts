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

// Enhanced caching with TTL for system-region mappings
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const systemCache = new Map<string, CacheEntry<{ region: string; systemId: number }>>();
const regionSystemsCache = new Map<string, CacheEntry<number[]>>();
const constellationRegionCache = new Map<number, CacheEntry<string>>();

// Cache for sovereignty campaigns with 30-second TTL for frequent updates
const campaignsCache = new Map<string, { data: SovereigntyCampaign[]; timestamp: number }>();
const CAMPAIGNS_CACHE_TTL = 30 * 1000; // 30 seconds for real-time updates

// Cache TTL for system/region data (24 hours - this data doesn't change)
const STATIC_DATA_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T> | undefined, ttl: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

const ESI_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Sway-Platform/1.0)',
}

export async function getSystemRegion(systemName: string): Promise<string | null> {
  try {
    // Check cache first with TTL validation
    const cachedEntry = systemCache.get(systemName);
    if (isCacheValid(cachedEntry, STATIC_DATA_CACHE_TTL)) {
      return cachedEntry!.data.region;
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

    // Cache result with timestamp
    systemCache.set(systemName, {
      data: {
        region: regionData.name,
        systemId: systemId,
      },
      timestamp: Date.now(),
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

    const response = await fetch(`https://esi.evetech.net/latest/sovereignty/campaigns/?datasource=tranquility&_t=${Date.now()}`, {
      headers: {
        ...ESI_HEADERS,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
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
    // Check cache first with TTL validation
    const cachedEntry = constellationRegionCache.get(constellationId);
    if (isCacheValid(cachedEntry, STATIC_DATA_CACHE_TTL)) {
      return cachedEntry!.data;
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

    // Cache result with timestamp
    constellationRegionCache.set(constellationId, {
      data: regionData.name,
      timestamp: Date.now(),
    });

    return regionData.name;
  } catch (error) {
    console.error('Error fetching constellation region from ESI:', error);
    return null;
  }
}

export async function getRegionSystems(regionName: string): Promise<number[]> {
  try {
    // Check cache first with TTL validation
    const cachedEntry = regionSystemsCache.get(regionName);
    if (isCacheValid(cachedEntry, STATIC_DATA_CACHE_TTL)) {
      return cachedEntry!.data;
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

    // Cache result with timestamp
    regionSystemsCache.set(regionName, {
      data: allSystems,
      timestamp: Date.now(),
    });
    return allSystems;
  } catch (error) {
    console.error('Error fetching region systems from ESI:', error);
    return [];
  }
}

// Bulk lookup function for multiple systems with optimized caching and concurrency
export async function getSystemRegionsBulk(systemNames: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const uncachedSystems: string[] = [];

  // First, check cache for all systems
  for (const systemName of systemNames) {
    const cachedEntry = systemCache.get(systemName);
    if (isCacheValid(cachedEntry, STATIC_DATA_CACHE_TTL)) {
      results.set(systemName, cachedEntry!.data.region);
    } else {
      uncachedSystems.push(systemName);
    }
  }

  if (uncachedSystems.length === 0) {
    return results;
  }

  // For uncached systems, use batch lookup
  try {
    // Step 1: Batch lookup system IDs
    const idsResponse = await fetch('https://esi.evetech.net/universe/ids', {
      method: 'POST',
      headers: ESI_HEADERS,
      body: JSON.stringify(uncachedSystems),
    });

    if (!idsResponse.ok) {
      console.error(`ESI /universe/ids failed: ${idsResponse.status} ${idsResponse.statusText}`);
      // Set all uncached systems to null
      uncachedSystems.forEach(system => results.set(system, null));
      return results;
    }

    const idsData = await idsResponse.json();
    const systemLookup = new Map<string, number>();

    // Map system names to IDs
    if (idsData.systems) {
      for (const system of idsData.systems) {
        // Find the original name (case-insensitive match)
        const originalName = uncachedSystems.find(name =>
          name.toLowerCase() === system.name.toLowerCase()
        );
        if (originalName) {
          systemLookup.set(originalName, system.id);
        }
      }
    }

    // Step 2: Batch fetch system details concurrently
    const systemPromises = Array.from(systemLookup.entries()).map(async ([systemName, systemId]) => {
      try {
        const systemResponse = await fetch(
          `https://esi.evetech.net/universe/systems/${systemId}`,
          { headers: ESI_HEADERS }
        );

        if (systemResponse.ok) {
          const systemData: EsiSystemData = await systemResponse.json();
          return { systemName, systemData, systemId };
        }
        return { systemName, systemData: null, systemId };
      } catch (error) {
        console.error(`Error fetching system ${systemId}:`, error);
        return { systemName, systemData: null, systemId };
      }
    });

    const systemResults = await Promise.all(systemPromises);

    // Step 3: Group by constellation for efficient region lookups
    const constellationMap = new Map<number, string[]>();
    const systemConstellationMap = new Map<string, number>();

    for (const { systemName, systemData } of systemResults) {
      if (systemData) {
        const constellationId = systemData.constellation_id;
        systemConstellationMap.set(systemName, constellationId);

        if (!constellationMap.has(constellationId)) {
          constellationMap.set(constellationId, []);
        }
        constellationMap.get(constellationId)!.push(systemName);
      } else {
        results.set(systemName, null);
      }
    }

    // Step 4: Batch fetch constellation regions concurrently
    const constellationPromises = Array.from(constellationMap.keys()).map(async (constellationId) => {
      try {
        const region = await getConstellationRegion(constellationId);
        return { constellationId, region };
      } catch (error) {
        console.error(`Error fetching constellation ${constellationId}:`, error);
        return { constellationId, region: null };
      }
    });

    const constellationResults = await Promise.all(constellationPromises);

    // Step 5: Map results back to systems and cache them
    for (const { constellationId, region } of constellationResults) {
      const systemsInConstellation = constellationMap.get(constellationId) || [];

      for (const systemName of systemsInConstellation) {
        results.set(systemName, region);

        // Cache the result
        const systemId = systemLookup.get(systemName);
        if (systemId && region) {
          systemCache.set(systemName, {
            data: { region, systemId },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Set any remaining uncached systems to null
    for (const systemName of uncachedSystems) {
      if (!results.has(systemName)) {
        results.set(systemName, null);
      }
    }

    return results;

  } catch (error) {
    console.error('Error in bulk system region lookup:', error);
    // Set all uncached systems to null as fallback
    uncachedSystems.forEach(system => results.set(system, null));
    return results;
  }
}

export type { SovereigntyCampaign, UniverseNamesResponse, EsiSystemData, EsiConstellationData, EsiRegionData };