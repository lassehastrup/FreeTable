import { Location } from '../types';

const DATA_BASE_URL = '/data';

export async function fetchLocations(): Promise<Location[]> {
  try {
    const response = await fetch(`${DATA_BASE_URL}/locations.json`);
    if (!response.ok) {
      throw new Error('Failed to fetch locations');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export async function fetchLocation(locationId: string): Promise<Location | null> {
  try {
    const response = await fetch(`${DATA_BASE_URL}/${locationId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch location: ${locationId}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching location ${locationId}:`, error);
    return null;
  }
}
