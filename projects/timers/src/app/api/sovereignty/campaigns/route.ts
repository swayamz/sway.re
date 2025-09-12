import { NextRequest, NextResponse } from 'next/server';
import { getSovereigntyCampaigns, getUniverseNames, getRegionSystems, getConstellationRegion } from '@/lib/esi';

export const dynamic = 'force-dynamic';

interface SovereigntyCampaignWithNames {
  campaign_id: number;
  structure_id: number;
  solar_system_id: number;
  solar_system_name?: string;
  region_name?: string;
  constellation_id: number;
  event_type: string;
  start_time: string;
  defender_id?: number;
  defender_name?: string;
  defender_score?: number;
  attackers_score?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const regions = searchParams.get('regions')?.split(',').filter(r => r.trim()) || [];

    const campaigns = await getSovereigntyCampaigns();
    
    if (campaigns.length === 0) {
      return NextResponse.json([]);
    }

    let filteredCampaigns = campaigns;

    // Create a map of system ID to region name for campaigns
    const systemToRegion = new Map<number, string>();

    if (regions.length > 0) {
      // Fetch region systems in parallel for better performance
      const regionSystemsPromises = regions.map(async (region) => {
        try {
          const systems = await getRegionSystems(region);
          // Map each system to its region
          systems.forEach(systemId => systemToRegion.set(systemId, region));
          return systems;
        } catch (error) {
          console.error(`Error fetching systems for region ${region}:`, error);
          return [];
        }
      });
      
      const allRegionSystemArrays = await Promise.all(regionSystemsPromises);
      const allRegionSystems = allRegionSystemArrays.flat();
      
      filteredCampaigns = campaigns.filter(campaign => 
        allRegionSystems.includes(campaign.solar_system_id)
      );
    }

    if (filteredCampaigns.length === 0) {
      return NextResponse.json([]);
    }

    const systemIds = [...new Set(filteredCampaigns.map(c => c.solar_system_id))];
    const defenderIds = [...new Set(filteredCampaigns.map(c => c.defender_id).filter(id => id !== undefined) as number[])];
    
    const allIds = [...systemIds, ...defenderIds];
    const names = await getUniverseNames(allIds);

    const namesMap = new Map(names.map(name => [name.id, name.name]));

    const campaignsWithNames: SovereigntyCampaignWithNames[] = filteredCampaigns.map(campaign => ({
      ...campaign,
      solar_system_name: namesMap.get(campaign.solar_system_id),
      region_name: systemToRegion.get(campaign.solar_system_id),
      defender_name: campaign.defender_id ? namesMap.get(campaign.defender_id) : undefined,
    }));

    return NextResponse.json(campaignsWithNames);
  } catch (error) {
    console.error('Error fetching sovereignty campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sovereignty campaigns' },
      { status: 500 }
    );
  }
}