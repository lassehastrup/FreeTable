import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TableMapper } from '../components/TableMapper';
import { ImageUploader } from '../components/ImageUploader';
import { TableMarker, LocationConfig } from '../types';
import { fetchLocationConfig, getFloorPlanUrlById } from '../../services/api';
import './AdminLocationPage.css';

export const AdminLocationPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const isNewLocation = locationId === 'new';
  const [step, setStep] = useState<'upload' | 'map' | 'export'>('upload');
  const [floorPlanImage, setFloorPlanImage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState(isNewLocation ? 'New Location' : locationId || '');
  const [markers, setMarkers] = useState<TableMarker[]>([]);
  const [isLoading, setIsLoading] = useState(!isNewLocation);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          setMarkers(config.tables);
          
          // Load the existing floor plan image
          const floorPlanUrl = getFloorPlanUrlById(locationId, config.floorPlanImage);
          setFloorPlanImage(floorPlanUrl);
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
    setFloorPlanImage(imageDataUrl);
  };

  const handleProceedToMapping = () => {
    if (floorPlanImage) {
      setStep('map');
    }
  };

  const handleMarkersChange = (newMarkers: TableMarker[]) => {
    setMarkers(newMarkers);
  };

  const handleExport = () => {
    setStep('export');
  };

  const generateConfig = (): LocationConfig => {
    return {
      id: locationId || 'new-location',
      name: locationName,
      floorPlanImage: 'floorplan.png', // Would be saved separately
      tables: markers,
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

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
            disabled={!floorPlanImage}
          >
            Skip to Table Editing →
          </button>
        </div>
      )}

      {/* Progress Steps */}
      <div className="admin-steps">
        <div 
          className={`step ${step === 'upload' ? 'active' : ''} ${floorPlanImage ? 'completed' : ''}`}
          onClick={() => setStep('upload')}
          style={{ cursor: 'pointer' }}
        >
          <span className="step-number">1</span>
          <span className="step-label">{isNewLocation ? 'Upload' : 'Change'} Floor Plan</span>
        </div>
        <div 
          className={`step ${step === 'map' ? 'active' : ''} ${markers.length > 0 ? 'completed' : ''}`}
          onClick={() => floorPlanImage && setStep('map')}
          style={{ cursor: floorPlanImage ? 'pointer' : 'not-allowed' }}
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

            <ImageUploader 
              currentImage={floorPlanImage || undefined}
              onImageSelect={handleImageSelect}
            />

            <button 
              className="btn-primary large"
              onClick={handleProceedToMapping}
              disabled={!floorPlanImage}
            >
              Continue to Table Mapping →
            </button>
          </div>
        )}

        {step === 'map' && floorPlanImage && (
          <div className="step-content map-step">
            <TableMapper
              floorPlanUrl={floorPlanImage}
              existingMarkers={markers}
              onMarkersChange={handleMarkersChange}
            />

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('upload')}>
                ← Back
              </button>
              <button 
                className="btn-primary"
                onClick={handleExport}
                disabled={markers.length === 0}
              >
                Export Configuration ({markers.length} tables) →
              </button>
            </div>
          </div>
        )}

        {step === 'export' && (
          <div className="step-content export-step">
            <h2>✅ Configuration Complete!</h2>
            <p>Copy the JSON below and save it to your location config file:</p>

            <div className="export-path">
              <code>locations/{locationId || 'your-location'}/config.json</code>
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
                <li>Save the floor plan image to <code>locations/{locationId}/floorplan.png</code></li>
                <li>Save the JSON config to <code>locations/{locationId}/config.json</code></li>
                <li>Run <code>pwsh ./scripts/Get-TableAvailability.ps1</code> to fetch calendar data</li>
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
