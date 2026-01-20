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

export interface Location {
  id: string;
  name: string;
  description?: string;
  floorPlan: FloorPlan;
  /** Floor plan image filename (stored in /locations/{id}/) */
  floorPlanImage?: string;
  tables: Table[];
  updatedAt?: string;
}
