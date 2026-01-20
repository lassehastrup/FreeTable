export interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
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
  width: number;
  height: number;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  floorPlan: FloorPlan;
  tables: Table[];
  updatedAt?: string;
}
