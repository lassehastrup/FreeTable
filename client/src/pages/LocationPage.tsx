import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLocation, getZoneFloorPlanUrl, getFloorPlanUrlById } from '../services/api';
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
  // null means showing overview, number means showing specific zone
  const [activeZoneIndex, setActiveZoneIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      if (!locationId) return;
      
      try {
        const data = await fetchLocation(locationId);
        if (data) {
          setLocation(data);
          // If no overview image or only 1 zone, go directly to zone view
          if (!data.overviewImage || data.zones.length <= 1) {
            setActiveZoneIndex(0);
          }
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

  const handleZoneClick = (index: number) => {
    setActiveZoneIndex(index);
  };

  const handleBackToOverview = () => {
    setActiveZoneIndex(null);
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

  // Get zones and check for overview
  const zones = location.zones || [];
  const hasOverview = !!location.overviewImage && zones.length > 1;
  const isShowingOverview = hasOverview && activeZoneIndex === null;
  const activeZone: Zone | null = activeZoneIndex !== null ? (zones[activeZoneIndex] || null) : null;
  const hasMultipleZones = zones.length > 1;
  const zoneLabel = location.zoneLabel === 'floor' ? 'Floor' : 'Zone';

  // Get all tables for total count
  const allTables = zones.flatMap(z => z.tables);
  const totalAvailable = allTables.filter(t => t.isAvailable).length;

  // Get tables from active zone
  const currentTables = activeZone?.tables || [];
  const zoneAvailableCount = currentTables.filter(t => t.isAvailable).length;
  
  // Determine floor plan URLs
  const overviewImageUrl = location.overviewImage 
    ? getFloorPlanUrlById(location.id, location.overviewImage)
    : null;
  const zoneFloorPlanUrl = activeZone 
    ? getZoneFloorPlanUrl(location.id, activeZone)
    : null;

  return (
    <div className="location-page">
      <header className="location-header">
        {isShowingOverview ? (
          <Link to="/" className="back-link">← Back to locations</Link>
        ) : hasOverview ? (
          <button className="back-link" onClick={handleBackToOverview}>← Back to overview</button>
        ) : (
          <Link to="/" className="back-link">← Back to locations</Link>
        )}
        <div className="header-content">
          <div className="header-info">
            <h1>{location.name}{activeZone && ` - ${activeZone.name}`}</h1>
            <p className="availability-summary">
              {isShowingOverview ? (
                <>
                  <span className="highlight">{totalAvailable}</span> of {allTables.length} desks available
                  <span className="zone-indicator"> across {zones.length} {zoneLabel.toLowerCase()}s</span>
                </>
              ) : (
                <>
                  <span className="highlight">{zoneAvailableCount}</span> of {currentTables.length} desks available
                </>
              )}
            </p>
          </div>
          {!isShowingOverview && (
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
          )}
        </div>
      </header>

      {/* Zone/Floor tabs - show if multiple zones and NOT showing overview */}
      {hasMultipleZones && !isShowingOverview && (
        <div className="zone-switcher">
          {hasOverview && (
            <button
              className="zone-btn overview-btn"
              onClick={handleBackToOverview}
            >
              <span className="zone-name">🏢 Overview</span>
            </button>
          )}
          {zones.map((zone, index) => {
            const zoneAvail = zone.tables.filter(t => t.isAvailable).length;
            return (
              <button
                key={zone.id}
                className={`zone-btn ${activeZoneIndex === index ? 'active' : ''}`}
                onClick={() => handleZoneClick(index)}
              >
                <span className="zone-name">{zone.name}</span>
                <span className="zone-availability">
                  {zoneAvail}/{zone.tables.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <main className="location-content">
        {/* Overview mode - show building overview with clickable zones */}
        {isShowingOverview && overviewImageUrl ? (
          <div className="overview-container">
            <div className="overview-image-wrapper">
              <img src={overviewImageUrl} alt={`${location.name} overview`} className="overview-image" />
              {/* Zone markers on overview */}
              {zones.map((zone, index) => {
                if (!zone.position) return null;
                const zoneAvail = zone.tables.filter(t => t.isAvailable).length;
                const zoneTotal = zone.tables.length;
                const availPercent = zoneTotal > 0 ? Math.round((zoneAvail / zoneTotal) * 100) : 0;
                return (
                  <button
                    key={zone.id}
                    className="overview-zone-marker"
                    style={{
                      left: `${zone.position.x}%`,
                      top: `${zone.position.y}%`,
                    }}
                    onClick={() => handleZoneClick(index)}
                  >
                    <span className="zone-marker-name">{zone.name}</span>
                    <span className={`zone-marker-stats ${availPercent > 50 ? 'good' : availPercent > 0 ? 'some' : 'none'}`}>
                      {zoneAvail}/{zoneTotal} available
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Zone list below overview */}
            <div className="overview-zone-list">
              {zones.map((zone, index) => {
                const zoneAvail = zone.tables.filter(t => t.isAvailable).length;
                return (
                  <button
                    key={zone.id}
                    className="overview-zone-card"
                    onClick={() => handleZoneClick(index)}
                  >
                    <span className="zone-card-name">{zone.name}</span>
                    <span className="zone-card-stats">
                      <span className="highlight">{zoneAvail}</span> / {zone.tables.length} available
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'floor' ? (
          zoneFloorPlanUrl ? (
            <ImageFloorPlan 
              floorPlanImageUrl={zoneFloorPlanUrl}
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
