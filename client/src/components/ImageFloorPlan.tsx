import React, { useState } from 'react';
import { Table } from '../types';
import './ImageFloorPlan.css';

interface ImageFloorPlanProps {
  floorPlanImageUrl: string;
  tables: Table[];
  onTableClick?: (table: Table) => void;
}

export const ImageFloorPlan: React.FC<ImageFloorPlanProps> = ({
  floorPlanImageUrl,
  tables,
  onTableClick,
}) => {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const getStatusClass = (table: Table): string => {
    if (table.isAvailable) return 'available';
    if (table.status === 'unknown') return 'unknown';
    return 'occupied';
  };

  return (
    <div className="image-floor-plan">
      <div className="floor-plan-wrapper">
        <img 
          src={floorPlanImageUrl} 
          alt="Office floor plan"
          className="floor-plan-image"
          draggable={false}
        />

        {/* Table markers */}
        {tables.map((table) => (
          <div
            key={table.id}
            className={`table-marker ${getStatusClass(table)} ${hoveredTable === table.id ? 'hovered' : ''}`}
            style={{
              left: `${table.position.x}%`,
              top: `${table.position.y}%`,
            }}
            onClick={() => onTableClick?.(table)}
            onMouseEnter={() => setHoveredTable(table.id)}
            onMouseLeave={() => setHoveredTable(null)}
          >
            <span className="marker-badge">{table.id}</span>
            
            {/* Tooltip */}
            <div className="marker-tooltip">
              <div className="tooltip-header">
                <span className="tooltip-id">{table.id}</span>
                <span className={`tooltip-status ${getStatusClass(table)}`}>
                  {table.isAvailable ? 'Available' : table.status}
                </span>
              </div>
              <div className="tooltip-name">{table.name}</div>
              {table.assignedUser && (
                <div className="tooltip-user">
                  👤 {table.assignedUser.split('@')[0]}
                </div>
              )}
              {table.reason && table.isAvailable && (
                <div className="tooltip-reason">
                  📅 {table.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="floor-plan-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot occupied"></span>
          <span>Occupied</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unknown"></span>
          <span>Unknown</span>
        </div>
      </div>
    </div>
  );
};
