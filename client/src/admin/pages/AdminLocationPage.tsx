import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TableMapper } from '../components/TableMapper';
import { ImageUploader } from '../components/ImageUploader';
import { TableMarker, LocationConfig, Zone } from '../types';
import { fetchLocationConfig, getFloorPlanUrlById } from '../../services/api';
import './AdminLocationPage.css';

export const AdminLocationPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const isNewLocation = locationId === 'new';
  const [step, setStep] = useState<'upload' | 'map' | 'export'>('upload');
  const [locationName, setLocationName] = useState(isNewLocation ? 'New Location' : locationId || '');
  const [zoneLabel, setZoneLabel] = useState<'zone' | 'floor'>('zone');
  const [zones, setZones] = useState<Zone[]>([{ id: 'main', name: 'Main', floorPlanImage: '', tables: [] }]);
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(!isNewLocation);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Get active zone
  const activeZone = zones[activeZoneIndex] || zones[0];

  // Load existing location data if editing
  useEffect(() => {
    if (isNewLocation || !locationId) {
      setIsLoading(false);
      return;
    }

    const loadLocationData = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        const config = await fetchLocationConfig(locationId);
        if (config) {
          setLocationName(config.name);
          setZoneLabel(config.zoneLabel || 'zone');
          
          // Load zones with floor plan URLs
          const loadedZones = config.zones.map(zone => ({
            ...zone,
            floorPlanImage: getFloorPlanUrlById(locationId, zone.floorPlanImage),
          }));
          setZones(loadedZones);
          setActiveZoneIndex(0);
        } else {
          setLoadError('Location not found');
        }
      } catch (error) {
        console.error('Failed to load location:', error);
        setLoadError('Failed to load location configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadLocationData();
  }, [locationId, isNewLocation]);

  const handleImageSelect = (imageDataUrl: string) => {
    // Update the active zone's floor plan
    setZones(prev => prev.map((z, i) => 
      i === activeZoneIndex ? { ...z, floorPlanImage: imageDataUrl } : z
    ));
  };

  const handleProceedToMapping = () => {
    if (activeZone.floorPlanImage) {
      setStep('map');
    }
  };

  const handleMarkersChange = (newMarkers: TableMarker[]) => {
    // Update the active zone's tables
    setZones(prev => prev.map((z, i) => 
      i === activeZoneIndex ? { ...z, tables: newMarkers } : z
    ));
  };

  const handleExport = () => {
    setStep('export');
  };

  const addZone = () => {
    const newZoneNum = zones.length + 1;
    const label = zoneLabel === 'floor' ? 'Floor' : 'Zone';
    const newZone: Zone = {
      id: `${zoneLabel}-${newZoneNum}`,
      name: `${label} ${newZoneNum}`,
      floorPlanImage: '',
      tables: [],
    };
    setZones([...zones, newZone]);
    setActiveZoneIndex(zones.length);
    setStep('upload'); // Go back to upload for new zone
  };

  const deleteZone = (index: number) => {
    if (zones.length <= 1) return; // Keep at least one zone
    const newZones = zones.filter((_, i) => i !== index);
    setZones(newZones);
    if (activeZoneIndex >= newZones.length) {
      setActiveZoneIndex(newZones.length - 1);
    }
  };

  const renameZone = (index: number, newName: string) => {
    setZones(prev => prev.map((z, i) => 
      i === index ? { ...z, name: newName } : z
    ));
  };

  const getZoneLabelText = (plural = false) => {
    if (zoneLabel === 'floor') return plural ? 'Floors' : 'Floor';
    return plural ? 'Zones' : 'Zone';
  };

  const generateConfig = (): LocationConfig => {
    // Generate export config with proper file names for each zone
    const exportZones = zones.map((zone) => {
      // Generate filename based on zone id/name
      const filename = zones.length === 1 
        ? 'floorplan.png' 
        : `floorplan-${zone.id.toLowerCase().replace(/\s+/g, '-')}.png`;
      return {
        id: zone.id,
        name: zone.name,
        floorPlanImage: filename,
        tables: zone.tables,
      };
    });

    return {
      id: locationId === 'new' ? locationName.toLowerCase().replace(/\s+/g, '-') : locationId || 'new-location',
      name: locationName,
      zoneLabel: zones.length > 1 ? zoneLabel : undefined,
      zones: exportZones,
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadConfig = () => {
    const config = generateConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFloorPlan = (zone: Zone) => {
    if (!zone.floorPlanImage) return;
    
    // If it's a data URL (newly uploaded), download it
    if (zone.floorPlanImage.startsWith('data:')) {
      const filename = zones.length === 1 
        ? 'floorplan.png' 
        : `floorplan-${zone.id.toLowerCase().replace(/\s+/g, '-')}.png`;
      const a = document.createElement('a');
      a.href = zone.floorPlanImage;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const hasNewFloorPlans = zones.some(z => z.floorPlanImage?.startsWith('data:'));
  const totalTables = zones.reduce((sum, z) => sum + z.tables.length, 0);

  // Show loading state
  if (isLoading) {
    return (
      <div className="admin-location-page">
        <header className="admin-header">
          <Link to="/admin" className="back-link">← Back to Admin</Link>
          <h1>🛠️ Loading...</h1>
        </header>
        <main className="admin-content">
          <div className="loading-message">Loading location configuration...</div>
        </main>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="admin-location-page">
        <header className="admin-header">
          <Link to="/admin" className="back-link">← Back to Admin</Link>
          <h1>🛠️ Error</h1>
        </header>
        <main className="admin-content">
          <div className="error-message">{loadError}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-location-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link">← Back to Admin</Link>
        <h1>🛠️ {isNewLocation ? 'Create' : 'Edit'}: {locationName}</h1>
      </header>

      {/* Edit mode quick actions */}
      {!isNewLocation && step === 'upload' && (
        <div className="edit-mode-banner">
          <span>📝 Editing existing location</span>
          <button 
            className="btn-secondary small"
            onClick={() => setStep('map')}
            disabled={!activeZone.floorPlanImage}
          >
            Skip to Table Editing →
          </button>
        </div>
      )}

      {/* Zone Tabs - show if more than 1 zone or in edit mode */}
      {(zones.length > 1 || step === 'upload') && (
        <div className="zone-tabs">
          <div className="zone-tabs-header">
            <span className="zone-label">{getZoneLabelText(true)}:</span>
            {step === 'upload' && (
              <div className="zone-label-toggle">
                <button 
                  className={`label-btn ${zoneLabel === 'zone' ? 'active' : ''}`}
                  onClick={() => setZoneLabel('zone')}
                >
                  Zones
                </button>
                <button 
                  className={`label-btn ${zoneLabel === 'floor' ? 'active' : ''}`}
                  onClick={() => setZoneLabel('floor')}
                >
                  Floors
                </button>
              </div>
            )}
          </div>
          <div className="zone-tabs-list">
            {zones.map((zone, index) => (
              <button
                key={zone.id}
                className={`zone-tab ${activeZoneIndex === index ? 'active' : ''}`}
                onClick={() => setActiveZoneIndex(index)}
              >
                {zone.name}
                {zone.tables.length > 0 && <span className="zone-table-count">{zone.tables.length}</span>}
              </button>
            ))}
            {step === 'upload' && (
              <button className="zone-tab add-zone" onClick={addZone}>
                + Add {getZoneLabelText()}
              </button>
            )}
          </div>
          {step === 'upload' && zones.length > 1 && (
            <div className="zone-actions">
              <button 
                className="btn-small"
                onClick={() => {
                  const newName = prompt(`Rename ${getZoneLabelText()}:`, activeZone.name);
                  if (newName) renameZone(activeZoneIndex, newName);
                }}
              >
                ✏️ Rename
              </button>
              <button 
                className="btn-small btn-danger"
                onClick={() => {
                  if (confirm(`Delete ${activeZone.name}? This cannot be undone.`)) {
                    deleteZone(activeZoneIndex);
                  }
                }}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress Steps */}
      <div className="admin-steps">
        <div 
          className={`step ${step === 'upload' ? 'active' : ''} ${activeZone.floorPlanImage ? 'completed' : ''}`}
          onClick={() => setStep('upload')}
          style={{ cursor: 'pointer' }}
        >
          <span className="step-number">1</span>
          <span className="step-label">{isNewLocation ? 'Upload' : 'Change'} Floor Plan</span>
        </div>
        <div 
          className={`step ${step === 'map' ? 'active' : ''} ${activeZone.tables.length > 0 ? 'completed' : ''}`}
          onClick={() => activeZone.floorPlanImage && setStep('map')}
          style={{ cursor: activeZone.floorPlanImage ? 'pointer' : 'not-allowed' }}
        >
          <span className="step-number">2</span>
          <span className="step-label">Place Tables</span>
        </div>
        <div className={`step ${step === 'export' ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Export Config</span>
        </div>
      </div>

      <main className="admin-content">
        {step === 'upload' && (
          <div className="step-content upload-step">
            <div className="form-section">
              <label>Location Name</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Aarhus Office"
                className="location-name-input"
              />
            </div>

            {zones.length > 1 && (
              <div className="current-zone-info">
                Uploading floor plan for: <strong>{activeZone.name}</strong>
              </div>
            )}

            <ImageUploader 
              currentImage={activeZone.floorPlanImage || undefined}
              onImageSelect={handleImageSelect}
            />

            <button 
              className="btn-primary large"
              onClick={handleProceedToMapping}
              disabled={!activeZone.floorPlanImage}
            >
              Continue to Table Mapping →
            </button>
          </div>
        )}

        {step === 'map' && activeZone.floorPlanImage && (
          <div className="step-content map-step">
            {zones.length > 1 && (
              <div className="current-zone-info map-zone-info">
                Editing: <strong>{activeZone.name}</strong>
              </div>
            )}
            <TableMapper
              floorPlanUrl={activeZone.floorPlanImage}
              existingMarkers={activeZone.tables}
              onMarkersChange={handleMarkersChange}
            />

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('upload')}>
                ← Back
              </button>
              <button 
                className="btn-primary"
                onClick={handleExport}
                disabled={totalTables === 0}
              >
                Export Configuration ({totalTables} tables) →
              </button>
            </div>
          </div>
        )}

        {step === 'export' && (
          <div className="step-content export-step">
            <h2>✅ Configuration Complete!</h2>
            <p>
              {zones.length > 1 
                ? `${zones.length} ${getZoneLabelText(true).toLowerCase()} with ${totalTables} tables configured.`
                : `${totalTables} tables configured.`
              }
            </p>

            <div className="export-actions-top">
              <button className="btn-primary" onClick={downloadConfig}>
                📥 Download config.json
              </button>
              {hasNewFloorPlans && (
                <div className="floorplan-downloads">
                  {zones.map((zone) => (
                    zone.floorPlanImage?.startsWith('data:') && (
                      <button 
                        key={zone.id}
                        className="btn-secondary"
                        onClick={() => downloadFloorPlan(zone)}
                      >
                        📥 Download {zones.length > 1 ? `${zone.name} ` : ''}Floor Plan
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>

            <div className="export-path">
              <code>locations/{generateConfig().id}/config.json</code>
            </div>

            <div className="export-box">
              <pre>{JSON.stringify(generateConfig(), null, 2)}</pre>
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(JSON.stringify(generateConfig(), null, 2))}
              >
                📋 Copy
              </button>
            </div>

            <div className="export-instructions">
              <h3>Next Steps:</h3>
              <ol>
                {zones.map((zone) => {
                  const filename = zones.length === 1 
                    ? 'floorplan.png' 
                    : `floorplan-${zone.id.toLowerCase().replace(/\s+/g, '-')}.png`;
                  return zone.floorPlanImage?.startsWith('data:') ? (
                    <li key={zone.id}>
                      Save the {zones.length > 1 ? `${zone.name} ` : ''}floor plan image to <code>locations/{generateConfig().id}/{filename}</code>
                    </li>
                  ) : null;
                })}
                <li>Save the JSON config to <code>locations/{generateConfig().id}/config.json</code></li>
                <li>Run <code>pwsh ./powershell/Update-Availability.ps1</code> to fetch calendar data</li>
              </ol>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('map')}>
                ← Back to Mapping
              </button>
              <Link to="/" className="btn-primary">
                View Live Dashboard →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
