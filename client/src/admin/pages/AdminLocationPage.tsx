import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TableMapper } from '../components/TableMapper';
import { ImageUploader } from '../components/ImageUploader';
import { TableMarker, LocationConfig } from '../types';
import './AdminLocationPage.css';

export const AdminLocationPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const [step, setStep] = useState<'upload' | 'map' | 'export'>('upload');
  const [floorPlanImage, setFloorPlanImage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState(locationId || 'New Location');
  const [markers, setMarkers] = useState<TableMarker[]>([]);

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

  return (
    <div className="admin-location-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link">← Back to Admin</Link>
        <h1>🛠️ Configure: {locationName}</h1>
      </header>

      {/* Progress Steps */}
      <div className="admin-steps">
        <div className={`step ${step === 'upload' ? 'active' : ''} ${floorPlanImage ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Upload Floor Plan</span>
        </div>
        <div className={`step ${step === 'map' ? 'active' : ''} ${markers.length > 0 ? 'completed' : ''}`}>
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
