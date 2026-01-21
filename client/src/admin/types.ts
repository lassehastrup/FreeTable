/**
 * Admin Types - Used for the table mapping/configuration tool
 */

export interface TableMarker {
  id: string;
  name: string;
  assignedUser: string | null;
  /** Position as percentage of image dimensions (0-100) */
  position: {
    x: number;
    y: number;
  };
}

export interface Zone {
  id: string;
  name: string;
  /** Filename of the floor plan image for this zone */
  floorPlanImage: string;
  tables: TableMarker[];
}

export interface LocationConfig {
  id: string;
  name: string;
  description?: string;
  /** Label for zones - 'zone' or 'floor'. Defaults to 'zone' */
  zoneLabel?: 'zone' | 'floor';
  /** Multiple zones/floors in this location */
  zones: Zone[];
  
  // Legacy fields for backwards compatibility (single zone)
  /** @deprecated Use zones instead */
  floorPlanImage?: string;
  /** @deprecated Use zones instead */
  tables?: TableMarker[];
}

export interface PendingMarker {
  id: string;
  name: string;
  position: { x: number; y: number };
}
