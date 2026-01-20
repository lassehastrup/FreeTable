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

export interface LocationConfig {
  id: string;
  name: string;
  description?: string;
  /** Filename of the floor plan image (stored in /locations/{id}/) */
  floorPlanImage: string;
  tables: TableMarker[];
}

export interface PendingMarker {
  id: string;
  name: string;
  position: { x: number; y: number };
}
