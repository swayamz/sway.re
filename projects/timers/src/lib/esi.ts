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

const systemCache = new Map<string, { region: string; systemId: number }>();

const ESI_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Compatibility-Date': '2025-08-26',
  'Accept-Language': '',
  'If-None-Match': '',
  'X-Tenant': '',
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
