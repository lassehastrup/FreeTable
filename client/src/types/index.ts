export interface TablePosition {
  /** X position as percentage (0-100) for image overlay, or pixels for SVG */
  x: number;
  /** Y position as percentage (0-100) for image overlay, or pixels for SVG */
  y: number;
  /** Width in pixels (only used for SVG floor plans) */
  width?: number;
  /** Height in pixels (only used for SVG floor plans) */
  height?: number;
}

export interface Table {
  id: string;
  name: string;
  assignedUser: string | null;
  status: 'available' | 'occupied' | 'unknown';
  isAvailable: boolean;
  reason: string | null;
  position: TablePosition;
}

export interface FloorPlan {
  /** Width in pixels (for SVG) */
  width: number;
  /** Height in pixels (for SVG) */
  height: number;
  /** Optional image URL for image-based floor plans */
  imageUrl?: string;
}

export interface Zone {
  id: string;
  name: string;
  floorPlanImage: string;
  /** Position on overview map as percentage (0-100) */
  position?: {
    x: number;
    y: number;
  };
  tables: Table[];
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  /** Label for zones - 'zone' or 'floor'. Defaults to 'zone' */
  zoneLabel?: 'zone' | 'floor';
  /** Overview/building floor plan image (optional - for multi-zone navigation) */
  overviewImage?: string;
  /** Multiple zones/floors in this location */
  zones: Zone[];
  
  // Legacy fields for backwards compatibility
  floorPlan?: FloorPlan;
  floorPlanImage?: string;
  tables?: Table[];
  updatedAt?: string;
}
