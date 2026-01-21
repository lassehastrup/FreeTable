import React from 'react';
import { Location, Table } from '../types';
import './FloorPlanView.css';

interface FloorPlanViewProps {
  location: Location;
  onTableClick?: (table: Table) => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ location, onTableClick }) => {
  const floorPlan = location.floorPlan;
  // Get tables from first zone or legacy tables
  const tables = location.zones?.[0]?.tables || location.tables || [];

  // Return null if no floor plan data
  if (!floorPlan) {
    return <div className="floor-plan-container">No floor plan available</div>;
  }

  const getStatusClass = (table: Table): string => {
    if (table.isAvailable) return 'available';
    if (table.status === 'unknown') return 'unknown';
    return 'occupied';
  };

  return (
    <div className="floor-plan-container">
      <svg
        viewBox={`0 0 ${floorPlan.width} ${floorPlan.height}`}
        className="floor-plan-svg"
        role="img"
        aria-label={`Floor plan of ${location.name}`}
      >
        {/* Background */}
        <rect
          x="0"
          y="0"
          width={floorPlan.width}
          height={floorPlan.height}
          fill="#f7fafc"
          stroke="#e2e8f0"
          strokeWidth="2"
        />

        {/* Tables */}
        {tables.map((table) => (
          <g
            key={table.id}
            className={`floor-table ${getStatusClass(table)}`}
            onClick={() => onTableClick?.(table)}
            role="button"
            tabIndex={0}
            aria-label={`${table.name}: ${table.isAvailable ? 'Available' : 'Occupied'}`}
          >
            <rect
              x={table.position.x}
              y={table.position.y}
              width={table.position.width || 80}
              height={table.position.height || 60}
              rx="8"
              ry="8"
            />
            <text
              x={table.position.x + (table.position.width || 80) / 2}
              y={table.position.y + (table.position.height || 60) / 2 - 8}
              textAnchor="middle"
              dominantBaseline="middle"
              className="table-label"
            >
              {table.id}
            </text>
            <text
              x={table.position.x + (table.position.width || 80) / 2}
              y={table.position.y + (table.position.height || 60) / 2 + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              className="table-status"
            >
              {table.isAvailable ? '✓' : '✗'}
            </text>
          </g>
        ))}
      </svg>

      <div className="floor-plan-legend">
        <div className="legend-item">
          <span className="legend-color available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-color occupied"></span>
          <span>Occupied</span>
        </div>
        <div className="legend-item">
          <span className="legend-color unknown"></span>
          <span>Unknown</span>
        </div>
      </div>
    </div>
  );
};
