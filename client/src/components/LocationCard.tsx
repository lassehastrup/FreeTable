import React from 'react';
import { Link } from 'react-router-dom';
import { Location } from '../types';
import './LocationCard.css';

interface LocationCardProps {
  location: Location;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
  // Get tables from zones or legacy tables field
  const allTables = location.zones?.flatMap(z => z.tables) || location.tables || [];
  const availableCount = allTables.filter(t => t.isAvailable).length;
  const totalCount = allTables.length;
  const availabilityPercentage = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  return (
    <Link to={`/location/${location.id}`} className="location-card">
      <div className="location-card-header">
        <h2 className="location-name">{location.name}</h2>
        {location.description && (
          <p className="location-description">{location.description}</p>
        )}
      </div>
      
      <div className="location-stats">
        <div className="availability-ring">
          <svg viewBox="0 0 36 36" className="circular-chart">
            <path
              className="circle-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="circle"
              strokeDasharray={`${availabilityPercentage}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" className="percentage">{availableCount}</text>
          </svg>
        </div>
        <div className="stats-text">
          <span className="available-count">{availableCount} of {totalCount}</span>
          <span className="stats-label">tables available</span>
        </div>
      </div>

      {location.updatedAt && (
        <p className="last-updated">
          Updated: {new Date(location.updatedAt).toLocaleTimeString()}
        </p>
      )}
    </Link>
  );
};
