import { Location } from '../types';

const LOCATIONS_BASE_URL = '/locations';

// List of known location IDs - in production, this could come from an index file
const LOCATION_IDS = ['aarhus', 'skanderborg'];

export async function fetchLocations(): Promise<Location[]> {
  try {
    // Fetch each location's config.json
    const locationPromises = LOCATION_IDS.map(async (id) => {
      const response = await fetch(`${LOCATIONS_BASE_URL}/${id}/config.json`);
      if (!response.ok) return null;
      const config = await response.json();
      return {
        ...config,
        // Add default status fields if not present (will be updated by PowerShell)
        tables: config.tables.map((table: Record<string, unknown>) => ({
          ...table,
          status: table.status || 'unknown',
          isAvailable: table.isAvailable ?? false,
          reason: table.reason || null,
        })),
      } as Location;
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
    
    return {
      ...config,
      tables: config.tables.map((table: Record<string, unknown>) => ({
        ...table,
        status: table.status || 'unknown',
        isAvailable: table.isAvailable ?? false,
        reason: table.reason || null,
      })),
    } as Location;
  } catch (error) {
    console.error(`Error fetching location ${locationId}:`, error);
    return null;
  }
}

/**
 * Get the URL for a location's floor plan image
 */
export function getFloorPlanUrl(location: Location): string {
  const imageName = location.floorPlanImage || 'floorplan.svg';
  return `${LOCATIONS_BASE_URL}/${location.id}/${imageName}`;
}

/**
 * Fetch raw location config for admin editing
 */
export async function fetchLocationConfig(locationId: string): Promise<{
  id: string;
  name: string;
  floorPlanImage: string;
  tables: Array<{
    id: string;
    name: string;
    assignedUser: string | null;
    position: { x: number; y: number };
  }>;
} | null> {
  try {
    const response = await fetch(`${LOCATIONS_BASE_URL}/${locationId}/config.json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
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
