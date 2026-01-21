import { Location, Zone, Table } from '../types';
import { LocationConfig, Zone as AdminZone } from '../admin/types';

const LOCATIONS_BASE_URL = '/locations';

// List of known location IDs - in production, this could come from an index file
const LOCATION_IDS = ['aarhus', 'skanderborg'];

/**
 * Add default status fields to tables
 */
function enrichTables(tables: Record<string, unknown>[]): Table[] {
  return tables.map((table) => ({
    ...table,
    status: table.status || 'unknown',
    isAvailable: table.isAvailable ?? false,
    reason: table.reason || null,
  })) as Table[];
}

/**
 * Convert legacy single-zone config to multi-zone format
 */
function normalizeLocationConfig(config: Record<string, unknown>): Location {
  // Check if already has zones array
  if (Array.isArray(config.zones) && config.zones.length > 0) {
    return {
      ...config,
      zones: (config.zones as Record<string, unknown>[]).map((zone) => ({
        ...zone,
        tables: enrichTables((zone.tables as Record<string, unknown>[]) || []),
      })),
    } as Location;
  }
  
  // Legacy format: convert to single zone
  const tables = enrichTables((config.tables as Record<string, unknown>[]) || []);
  const zone: Zone = {
    id: 'main',
    name: 'Main',
    floorPlanImage: (config.floorPlanImage as string) || 'floorplan.svg',
    tables,
  };
  
  return {
    id: config.id as string,
    name: config.name as string,
    description: config.description as string | undefined,
    zoneLabel: (config.zoneLabel as 'zone' | 'floor') || 'zone',
    zones: [zone],
  };
}

export async function fetchLocations(): Promise<Location[]> {
  try {
    // Fetch each location's config.json
    const locationPromises = LOCATION_IDS.map(async (id) => {
      const response = await fetch(`${LOCATIONS_BASE_URL}/${id}/config.json`);
      if (!response.ok) return null;
      const config = await response.json();
      return normalizeLocationConfig(config);
    });

    const locations = await Promise.all(locationPromises);
    return locations.filter((loc): loc is Location => loc !== null);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export async function fetchLocation(locationId: string): Promise<Location | null> {
  try {
    const response = await fetch(`${LOCATIONS_BASE_URL}/${locationId}/config.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch location: ${locationId}`);
    }
    const config = await response.json();
    return normalizeLocationConfig(config);
  } catch (error) {
    console.error(`Error fetching location ${locationId}:`, error);
    return null;
  }
}

/**
 * Get the URL for a location's floor plan image (for first/default zone)
 */
export function getFloorPlanUrl(location: Location): string {
  if (location.zones && location.zones.length > 0) {
    return `${LOCATIONS_BASE_URL}/${location.id}/${location.zones[0].floorPlanImage}`;
  }
  // Legacy fallback
  const imageName = location.floorPlanImage || 'floorplan.svg';
  return `${LOCATIONS_BASE_URL}/${location.id}/${imageName}`;
}

/**
 * Get the URL for a specific zone's floor plan image
 */
export function getZoneFloorPlanUrl(locationId: string, zone: Zone): string {
  return `${LOCATIONS_BASE_URL}/${locationId}/${zone.floorPlanImage}`;
}

/**
 * Convert legacy admin config to multi-zone format
 */
function normalizeAdminConfig(config: Record<string, unknown>): LocationConfig {
  // Check if already has zones array
  if (Array.isArray(config.zones) && config.zones.length > 0) {
    return config as unknown as LocationConfig;
  }
  
  // Legacy format: convert to single zone
  const zone: AdminZone = {
    id: 'main',
    name: 'Main',
    floorPlanImage: (config.floorPlanImage as string) || 'floorplan.png',
    tables: (config.tables as AdminZone['tables']) || [],
  };
  
  return {
    id: config.id as string,
    name: config.name as string,
    description: config.description as string | undefined,
    zoneLabel: (config.zoneLabel as 'zone' | 'floor') || 'zone',
    zones: [zone],
  };
}

/**
 * Fetch raw location config for admin editing
 */
export async function fetchLocationConfig(locationId: string): Promise<LocationConfig | null> {
  try {
    const response = await fetch(`${LOCATIONS_BASE_URL}/${locationId}/config.json`);
    if (!response.ok) {
      return null;
    }
    const config = await response.json();
    return normalizeAdminConfig(config);
  } catch (error) {
    console.error(`Error fetching location config ${locationId}:`, error);
    return null;
  }
}

/**
 * Get the floor plan URL for a location by ID
 */
export function getFloorPlanUrlById(locationId: string, imageName: string): string {
  return `${LOCATIONS_BASE_URL}/${locationId}/${imageName}`;
}
