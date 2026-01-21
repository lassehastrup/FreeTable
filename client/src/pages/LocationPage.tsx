import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLocation, getZoneFloorPlanUrl } from '../services/api';
import { Location, Table, Zone } from '../types';
import { FloorPlanView } from '../components/FloorPlanView';
import { ImageFloorPlan } from '../components/ImageFloorPlan';
import { TableCard } from '../components/TableCard';
import './LocationPage.css';

export const LocationPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [viewMode, setViewMode] = useState<'floor' | 'grid'>('floor');
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);

  useEffect(() => {
    const loadLocation = async () => {
      if (!locationId) return;
      
      try {
        const data = await fetchLocation(locationId);
        if (data) {
          setLocation(data);
        } else {
          setError('Location not found');
        }
      } catch (err) {
        setError('Failed to load location data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
  }, [locationId]);

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const closeModal = () => {
    setSelectedTable(null);
  };

  if (loading) {
    return (
      <div className="location-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="location-page">
        <Link to="/" className="back-link">← Back to locations</Link>
        <div className="error-container">
          <h2>Location Not Found</h2>
          <p>{error || 'The requested location does not exist.'}</p>
        </div>
      </div>
    );
  }

  // Get zones and active zone
  const zones = location.zones || [];
  const activeZone: Zone | null = zones[activeZoneIndex] || zones[0] || null;
  const hasMultipleZones = zones.length > 1;

  // Get tables from active zone (or all tables for legacy format)
  const currentTables = activeZone?.tables || location.tables || [];
  const availableCount = currentTables.filter(t => t.isAvailable).length;
  
  // Determine if we have an image-based floor plan for this zone
  const floorPlanImageUrl = activeZone 
    ? getZoneFloorPlanUrl(location.id, activeZone)
    : null;

  return (
    <div className="location-page">
      <header className="location-header">
        <Link to="/" className="back-link">← Back to locations</Link>
        <div className="header-content">
          <div className="header-info">
            <h1>{location.name}</h1>
            <p className="availability-summary">
              <span className="highlight">{availableCount}</span> of {currentTables.length} desks available
              {hasMultipleZones && activeZone && <span className="zone-indicator"> in {activeZone.name}</span>}
            </p>
          </div>
          <div className="view-toggle">
            <button 
              className={viewMode === 'floor' ? 'active' : ''} 
              onClick={() => setViewMode('floor')}
            >
              Floor Plan
            </button>
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </button>
          </div>
        </div>
      </header>

      {/* Zone/Floor tabs - only show if multiple zones */}
      {hasMultipleZones && (
        <div className="zone-switcher">
          {zones.map((zone, index) => {
            const zoneAvailable = zone.tables.filter(t => t.isAvailable).length;
            return (
              <button
                key={zone.id}
                className={`zone-btn ${activeZoneIndex === index ? 'active' : ''}`}
                onClick={() => setActiveZoneIndex(index)}
              >
                <span className="zone-name">{zone.name}</span>
                <span className="zone-availability">
                  {zoneAvailable}/{zone.tables.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <main className="location-content">
        {viewMode === 'floor' ? (
          floorPlanImageUrl ? (
            <ImageFloorPlan 
              floorPlanImageUrl={floorPlanImageUrl}
              tables={currentTables}
              onTableClick={handleTableClick}
            />
          ) : (
            <FloorPlanView location={location} onTableClick={handleTableClick} />
          )
        ) : (
          <div className="tables-grid">
            {currentTables.map(table => (
              <TableCard key={table.id} table={table} onClick={handleTableClick} />
            ))}
          </div>
        )}
      </main>

      {location.updatedAt && (
        <footer className="location-footer">
          Last updated: {new Date(location.updatedAt).toLocaleString()}
        </footer>
      )}

      {selectedTable && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <h2>{selectedTable.name}</h2>
            <div className={`modal-status ${selectedTable.isAvailable ? 'available' : 'occupied'}`}>
              {selectedTable.isAvailable ? '✓ Available' : '✗ Occupied'}
            </div>
            {selectedTable.assignedUser && (
              <p className="modal-user">
                <strong>Assigned to:</strong> {selectedTable.assignedUser}
              </p>
            )}
            {selectedTable.reason && (
              <p className="modal-reason">
                <strong>Status:</strong> {selectedTable.reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
