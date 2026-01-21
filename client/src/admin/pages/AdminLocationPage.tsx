import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TableMapper } from '../components/TableMapper';
import { ImageUploader } from '../components/ImageUploader';
import { TableMarker, LocationConfig, Zone } from '../types';
import { fetchLocationConfig, getFloorPlanUrlById } from '../../services/api';
import './AdminLocationPage.css';

export const AdminLocationPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const isNewLocation = locationId === 'new';
  const [step, setStep] = useState<'upload' | 'map' | 'overview' | 'export'>('overview');
  const [locationName, setLocationName] = useState(isNewLocation ? 'New Location' : locationId || '');
  const [zoneLabel, setZoneLabel] = useState<'zone' | 'floor'>('zone');
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(!isNewLocation);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overviewImage, setOverviewImage] = useState<string>('');
  const overviewRef = useRef<HTMLDivElement>(null);
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [pendingZonePosition, setPendingZonePosition] = useState<{ x: number; y: number } | null>(null);
  const [newZoneName, setNewZoneName] = useState('');

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
          
          // Load overview image if present
          if (config.overviewImage) {
            setOverviewImage(getFloorPlanUrlById(locationId, config.overviewImage));
          }
          
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

  const handleMarkersChange = (newMarkers: TableMarker[]) => {
    // Update the active zone's tables
    setZones(prev => prev.map((z, i) => 
      i === activeZoneIndex ? { ...z, tables: newMarkers } : z
    ));
  };

  const handleExport = () => {
    setStep('export');
  };

  const getZoneLabelText = (plural = false) => {
    if (zoneLabel === 'floor') return plural ? 'Floors' : 'Floor';
    return plural ? 'Zones' : 'Zone';
  };

  const handleOverviewImageSelect = (imageDataUrl: string) => {
    setOverviewImage(imageDataUrl);
  };

  // Handle clicking on overview to add new zone markers
  const handleOverviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overviewRef.current) return;
    
    const rect = overviewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // If dragging, update position of dragged zone
    if (draggingZoneId) {
      setZones(prev => prev.map(z => 
        z.id === draggingZoneId 
          ? { ...z, position: { x, y } }
          : z
      ));
      setDraggingZoneId(null);
      return;
    }
    
    // Show input for new zone name
    setPendingZonePosition({ x, y });
    setNewZoneName('');
    setEditingZoneId(null);
  };

  const handleAddZoneFromOverview = () => {
    if (!pendingZonePosition || !newZoneName.trim()) return;
    
    const newZoneId = `zone-${Date.now()}`;
    const newZone: Zone = {
      id: newZoneId,
      name: newZoneName.trim(),
      floorPlanImage: '',
      tables: [],
      position: pendingZonePosition,
    };
    
    setZones(prev => [...prev, newZone]);
    setPendingZonePosition(null);
    setNewZoneName('');
  };

  const handleCancelNewZone = () => {
    setPendingZonePosition(null);
    setNewZoneName('');
  };

  const handleZoneMarkerDragStart = (zoneId: string) => {
    setDraggingZoneId(zoneId);
  };

  const removeZoneFromOverview = (zoneId: string) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
  };

  const startEditingZoneName = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      setEditingZoneId(zoneId);
      setNewZoneName(zone.name);
    }
  };

  const saveZoneName = () => {
    if (editingZoneId && newZoneName.trim()) {
      setZones(prev => prev.map(z => 
        z.id === editingZoneId ? { ...z, name: newZoneName.trim() } : z
      ));
    }
    setEditingZoneId(null);
    setNewZoneName('');
  };

  // Get zones that have been placed on overview (have position)
  const overviewZones = zones.filter(z => z.position);

  // Helper to get location name for filenames (lowercase)
  const getLocationFilePrefix = () => {
    const id = locationId === 'new' ? locationName.toLowerCase().replace(/\s+/g, '-') : locationId || 'new-location';
    return id.toLowerCase();
  };

  // Get overview image filename
  const getOverviewFilename = () => `${getLocationFilePrefix()}-building.svg`;

  // Get zone floor plan filename - uses zone name number if available (e.g., "Zone 1" -> 1)
  const getZoneFilename = (zone: Zone, fallbackIndex: number) => {
    const prefix = getLocationFilePrefix().toLowerCase();
    // Try to extract number from zone name (e.g., "Zone 1", "Floor 2", "Zone A" -> use number if found)
    const numberMatch = zone.name.match(/(\d+)/);
    const zoneNumber = numberMatch ? numberMatch[1] : String(fallbackIndex + 1);
    return `${prefix}-zone-${zoneNumber}.svg`;
  };

  const generateConfig = (): LocationConfig => {
    // Generate export config with proper file names for each zone
    const exportZones = zones.map((zone, index) => {
      const filename = getZoneFilename(zone, index);
      return {
        id: zone.id,
        name: zone.name,
        floorPlanImage: filename,
        tables: zone.tables,
        position: zone.position,
      };
    });

    return {
      id: locationId === 'new' ? locationName.toLowerCase().replace(/\s+/g, '-') : locationId || 'new-location',
      name: locationName,
      zoneLabel: zones.length > 1 ? zoneLabel : undefined,
      overviewImage: overviewImage ? getOverviewFilename() : undefined,
      zones: exportZones,
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  const downloadFloorPlan = (zone: Zone, index: number) => {
    if (!zone.floorPlanImage) return;
    
    // If it's a data URL (newly uploaded), download it
    if (zone.floorPlanImage.startsWith('data:')) {
      const filename = getZoneFilename(zone, index);
      const a = document.createElement('a');
      a.href = zone.floorPlanImage;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const downloadOverviewImage = () => {
    if (!overviewImage || !overviewImage.startsWith('data:')) return;
    const a = document.createElement('a');
    a.href = overviewImage;
    a.download = getOverviewFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasNewFloorPlans = zones.some(z => z.floorPlanImage?.startsWith('data:'));
  const hasNewOverviewImage = overviewImage?.startsWith('data:');
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
      {!isNewLocation && step === 'overview' && (
        <div className="edit-mode-banner">
          <span>📝 Editing existing location</span>
          <button 
            className="btn-secondary small"
            onClick={() => setStep('map')}
            disabled={!activeZone?.floorPlanImage}
          >
            Skip to Table Editing →
          </button>
        </div>
      )}

      {/* Progress Steps */}
      <div className="admin-steps">
        <div 
          className={`step ${step === 'overview' ? 'active' : ''} ${overviewImage && overviewZones.length > 0 ? 'completed' : ''}`}
          onClick={() => setStep('overview')}
          style={{ cursor: 'pointer' }}
        >
          <span className="step-number">1</span>
          <span className="step-label">Building Overview</span>
        </div>
        <div 
          className={`step ${step === 'upload' ? 'active' : ''} ${activeZone?.floorPlanImage ? 'completed' : ''}`}
          onClick={() => overviewZones.length > 0 && setStep('upload')}
          style={{ cursor: overviewZones.length > 0 ? 'pointer' : 'not-allowed' }}
        >
          <span className="step-number">2</span>
          <span className="step-label">{getZoneLabelText()} Floor Plans</span>
        </div>
        <div 
          className={`step ${step === 'map' ? 'active' : ''} ${activeZone?.tables.length > 0 ? 'completed' : ''}`}
          onClick={() => activeZone?.floorPlanImage && setStep('map')}
          style={{ cursor: activeZone?.floorPlanImage ? 'pointer' : 'not-allowed' }}
        >
          <span className="step-number">3</span>
          <span className="step-label">Place Tables</span>
        </div>
        <div 
          className={`step ${step === 'export' ? 'active' : ''}`}
          onClick={() => totalTables > 0 && setStep('export')}
          style={{ cursor: totalTables > 0 ? 'pointer' : 'not-allowed' }}
        >
          <span className="step-number">4</span>
          <span className="step-label">Export Config</span>
        </div>
      </div>

      <main className="admin-content">
        {/* Step 1: Overview - Define zones on building map */}
        {step === 'overview' && (
          <div className="step-content overview-step">
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

            <h2>🏢 Building Overview</h2>
            <p className="step-description">
              Upload a building overview image and click on it to add {getZoneLabelText(true).toLowerCase()}. 
              This creates a navigable map where users can click on {getZoneLabelText(true).toLowerCase()} to explore.
            </p>
            
            <div className="overview-uploader">
              <ImageUploader 
                currentImage={overviewImage || undefined}
                onImageSelect={handleOverviewImageSelect}
              />
            </div>

            {overviewImage && (
              <div className="overview-mapper">
                <h3>Add {getZoneLabelText(true)} to the Overview</h3>
                <p className="mapper-instructions">
                  Click on the image to add a {getZoneLabelText().toLowerCase()} marker. 
                  Enter a name for each {getZoneLabelText().toLowerCase()}, then drag markers to reposition if needed.
                </p>

                <div className="zone-label-toggle overview-label-toggle">
                  <span>Label as:</span>
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
                
                <div 
                  ref={overviewRef}
                  className="overview-image-container"
                  onClick={handleOverviewClick}
                >
                  <img src={overviewImage} alt="Building Overview" className="overview-mapper-image" />
                  
                  {/* Existing zone markers */}
                  {overviewZones.map((zone) => (
                    <div
                      key={zone.id}
                      className={`zone-position-marker ${draggingZoneId === zone.id ? 'dragging' : ''} ${editingZoneId === zone.id ? 'editing' : ''}`}
                      style={{
                        left: `${zone.position!.x}%`,
                        top: `${zone.position!.y}%`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => {
                        if (editingZoneId !== zone.id) {
                          e.preventDefault();
                          handleZoneMarkerDragStart(zone.id);
                        }
                      }}
                    >
                      {editingZoneId === zone.id ? (
                        <div className="marker-edit-form">
                          <input
                            type="text"
                            value={newZoneName}
                            onChange={(e) => setNewZoneName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveZoneName();
                              if (e.key === 'Escape') { setEditingZoneId(null); setNewZoneName(''); }
                            }}
                            autoFocus
                            placeholder={`${getZoneLabelText()} name`}
                          />
                          <button className="marker-save" onClick={saveZoneName}>✓</button>
                        </div>
                      ) : (
                        <>
                          <span 
                            className="marker-name" 
                            onDoubleClick={() => startEditingZoneName(zone.id)}
                            title="Double-click to rename"
                          >
                            {zone.name}
                          </span>
                          <button 
                            className="marker-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeZoneFromOverview(zone.id);
                            }}
                          >×</button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Pending new zone marker */}
                  {pendingZonePosition && (
                    <div
                      className="zone-position-marker new-marker"
                      style={{
                        left: `${pendingZonePosition.x}%`,
                        top: `${pendingZonePosition.y}%`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="marker-edit-form">
                        <input
                          type="text"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddZoneFromOverview();
                            if (e.key === 'Escape') handleCancelNewZone();
                          }}
                          autoFocus
                          placeholder={`${getZoneLabelText()} name (e.g., ${zoneLabel === 'floor' ? 'Floor 1' : 'North Wing'})`}
                        />
                        <button className="marker-save" onClick={handleAddZoneFromOverview} disabled={!newZoneName.trim()}>✓</button>
                        <button className="marker-cancel" onClick={handleCancelNewZone}>×</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="zone-positions-list">
                  <h4>{getZoneLabelText(true)} Added ({overviewZones.length}):</h4>
                  {overviewZones.length === 0 ? (
                    <p className="no-zones-message">Click on the image above to add {getZoneLabelText(true).toLowerCase()}</p>
                  ) : (
                    overviewZones.map((zone) => (
                      <div key={zone.id} className="zone-position-item placed">
                        <span>{zone.name}</span>
                        <div className="zone-item-actions">
                          <button 
                            className="zone-action-btn"
                            onClick={() => startEditingZoneName(zone.id)}
                            title="Rename"
                          >✏️</button>
                          <button 
                            className="zone-action-btn danger"
                            onClick={() => removeZoneFromOverview(zone.id)}
                            title="Remove"
                          >🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="step-actions">
              <button 
                className="btn-primary"
                onClick={() => {
                  // Use overview zones for the next steps
                  if (overviewZones.length > 0) {
                    setZones(overviewZones);
                    setActiveZoneIndex(0);
                  }
                  setStep('upload');
                }}
                disabled={overviewZones.length === 0}
              >
                Configure {getZoneLabelText()} Floor Plans ({overviewZones.length}) →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload floor plans for each zone */}
        {step === 'upload' && (
          <div className="step-content upload-step">
            {zones.length > 1 && (
              <div className="zone-tabs-inline">
                <span>Select {getZoneLabelText()}:</span>
                {zones.map((zone, index) => (
                  <button
                    key={zone.id}
                    className={`zone-tab-btn ${activeZoneIndex === index ? 'active' : ''} ${zone.floorPlanImage ? 'has-image' : ''}`}
                    onClick={() => setActiveZoneIndex(index)}
                  >
                    {zone.name}
                    {zone.floorPlanImage && <span className="check">✓</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="current-zone-info">
              Upload floor plan for: <strong>{activeZone?.name || 'Zone'}</strong>
            </div>

            <ImageUploader 
              currentImage={activeZone?.floorPlanImage || undefined}
              onImageSelect={handleImageSelect}
            />

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('overview')}>
                ← Back to Overview
              </button>
              <button 
                className="btn-primary"
                onClick={() => setStep('map')}
                disabled={!activeZone?.floorPlanImage}
              >
                Place Tables on {activeZone?.name || 'Floor Plan'} →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Map tables on floor plan */}
        {step === 'map' && activeZone?.floorPlanImage && (
          <div className="step-content map-step">
            {zones.length > 1 && (
              <div className="zone-tabs-inline">
                <span>Select {getZoneLabelText()}:</span>
                {zones.map((zone, index) => (
                  <button
                    key={zone.id}
                    className={`zone-tab-btn ${activeZoneIndex === index ? 'active' : ''} ${zone.tables.length > 0 ? 'has-tables' : ''}`}
                    onClick={() => setActiveZoneIndex(index)}
                  >
                    {zone.name}
                    {zone.tables.length > 0 && <span className="count">{zone.tables.length}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="current-zone-info map-zone-info">
              Placing tables on: <strong>{activeZone.name}</strong>
            </div>
            
            <TableMapper
              floorPlanUrl={activeZone.floorPlanImage}
              existingMarkers={activeZone.tables}
              onMarkersChange={handleMarkersChange}
            />

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('upload')}>
                ← Back to Floor Plans
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
              {hasNewOverviewImage && (
                <button className="btn-secondary" onClick={downloadOverviewImage}>
                  📥 Download Overview Image
                </button>
              )}
              {hasNewFloorPlans && (
                <div className="floorplan-downloads">
                  {zones.map((zone, index) => (
                    zone.floorPlanImage?.startsWith('data:') && (
                      <button 
                        key={zone.id}
                        className="btn-secondary"
                        onClick={() => downloadFloorPlan(zone, index)}
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
                {hasNewOverviewImage && (
                  <li>Save the overview image to <code>locations/{generateConfig().id}/{getOverviewFilename()}</code></li>
                )}
                {zones.map((zone, index) => {
                  const filename = getZoneFilename(zone, index);
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
              <button className="btn-secondary" onClick={() => zones.length > 1 ? setStep('overview') : setStep('map')}>
                ← Back
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
