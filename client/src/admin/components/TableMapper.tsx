import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TableMarker, PendingMarker } from '../types';
import './TableMapper.css';

interface TableMapperProps {
  floorPlanUrl: string;
  existingMarkers: TableMarker[];
  onMarkersChange: (markers: TableMarker[]) => void;
}

export const TableMapper: React.FC<TableMapperProps> = ({
  floorPlanUrl,
  existingMarkers,
  onMarkersChange,
}) => {
  const [markers, setMarkers] = useState<TableMarker[]>(existingMarkers);
  const [pendingMarker, setPendingMarker] = useState<PendingMarker | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // Sync with external markers when they change (e.g., loading existing location)
  useEffect(() => {
    setMarkers(existingMarkers);
  }, [existingMarkers]);

  const getPositionFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Clamp to image bounds
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't create new marker if we're dragging or in drag mode
    if (draggingMarkerId || isDragMode) return;
    if (!imageRef.current) return;

    const position = getPositionFromEvent(e);
    if (!position) return;

    // Create a pending marker at click position
    const newId = `T${markers.length + 1}`;
    setPendingMarker({
      id: newId,
      name: `Table ${markers.length + 1}`,
      position,
    });
    setSelectedMarkerId(null);
  }, [markers.length, draggingMarkerId, isDragMode, getPositionFromEvent]);

  // Handle marker drag start
  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (!isDragMode) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingMarkerId(id);
    setSelectedMarkerId(id);
    setPendingMarker(null);
  }, [isDragMode]);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!draggingMarkerId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const position = getPositionFromEvent(e);
      if (!position) return;

      setMarkers(prev => prev.map(m => 
        m.id === draggingMarkerId 
          ? { ...m, position }
          : m
      ));
    };

    const handleMouseUp = () => {
      if (draggingMarkerId) {
        // Notify parent of change
        onMarkersChange(markers);
      }
      setDraggingMarkerId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingMarkerId, getPositionFromEvent, markers, onMarkersChange]);

  const confirmMarker = (assignedUser: string | null) => {
    if (!pendingMarker) return;

    const newMarker: TableMarker = {
      id: pendingMarker.id,
      name: pendingMarker.name,
      assignedUser,
      position: pendingMarker.position,
    };

    const updatedMarkers = [...markers, newMarker];
    setMarkers(updatedMarkers);
    onMarkersChange(updatedMarkers);
    setPendingMarker(null);
  };

  const updateMarker = (id: string, updates: Partial<TableMarker>) => {
    const updatedMarkers = markers.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    setMarkers(updatedMarkers);
    onMarkersChange(updatedMarkers);
  };

  const deleteMarker = (id: string) => {
    const updatedMarkers = markers.filter(m => m.id !== id);
    setMarkers(updatedMarkers);
    onMarkersChange(updatedMarkers);
    setSelectedMarkerId(null);
  };

  const handleMarkerClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // In drag mode, don't toggle selection on click (handled by mousedown/up)
    if (isDragMode) return;
    setSelectedMarkerId(selectedMarkerId === id ? null : id);
    setPendingMarker(null);
  };

  const selectedMarker = markers.find(m => m.id === selectedMarkerId);

  return (
    <div className="table-mapper">
      <div className="mapper-instructions">
        <h3>📍 {isDragMode ? 'Drag tables to reposition them' : 'Click on the floor plan to place table markers'}</h3>
        <p>
          {isDragMode 
            ? 'Click and drag any table marker to move it. Toggle off Move Mode to add new tables.'
            : 'Click anywhere on the image to add a new table. Click existing markers to edit them.'
          }
        </p>
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${!isDragMode ? 'active' : ''}`}
            onClick={() => setIsDragMode(false)}
          >
            ➕ Add Mode
          </button>
          <button 
            className={`mode-btn ${isDragMode ? 'active' : ''}`}
            onClick={() => setIsDragMode(true)}
          >
            ✋ Move Mode
          </button>
        </div>
      </div>

      <div className="mapper-container">
        <div 
          className={`mapper-image-wrapper ${isDragMode ? 'drag-mode' : ''}`}
          ref={imageRef}
          onClick={handleImageClick}
        >
          <img 
            src={floorPlanUrl} 
            alt="Floor Plan" 
            className="mapper-image"
            draggable={false}
          />

          {/* Existing markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className={`mapper-marker ${selectedMarkerId === marker.id ? 'selected' : ''} ${draggingMarkerId === marker.id ? 'dragging' : ''} ${isDragMode ? 'draggable' : ''}`}
              style={{
                left: `${marker.position.x}%`,
                top: `${marker.position.y}%`,
              }}
              onClick={(e) => handleMarkerClick(e, marker.id)}
              onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
            >
              <span className="marker-id">{marker.id}</span>
            </div>
          ))}

          {/* Pending marker (being placed) */}
          {pendingMarker && (
            <div
              className="mapper-marker pending"
              style={{
                left: `${pendingMarker.position.x}%`,
                top: `${pendingMarker.position.y}%`,
              }}
            >
              <span className="marker-id">?</span>
            </div>
          )}
        </div>

        {/* Sidebar for editing */}
        <div className="mapper-sidebar">
          {pendingMarker && (
            <div className="marker-form">
              <h4>New Table Marker</h4>
              <MarkerForm
                marker={pendingMarker}
                onSave={(id, name, user) => {
                  setPendingMarker({ ...pendingMarker, id, name });
                  confirmMarker(user);
                }}
                onCancel={() => setPendingMarker(null)}
                isNew
              />
            </div>
          )}

          {selectedMarker && !pendingMarker && (
            <div className="marker-form">
              <h4>Edit Table: {selectedMarker.id}</h4>
              <MarkerForm
                marker={selectedMarker}
                onSave={(id, name, user) => {
                  updateMarker(selectedMarker.id, { id, name, assignedUser: user });
                  setSelectedMarkerId(null);
                }}
                onCancel={() => setSelectedMarkerId(null)}
                onDelete={() => deleteMarker(selectedMarker.id)}
              />
            </div>
          )}

          {!pendingMarker && !selectedMarker && (
            <div className="marker-list">
              <h4>Tables ({markers.length})</h4>
              {markers.length === 0 ? (
                <p className="empty-message">No tables placed yet. Click on the floor plan to add one.</p>
              ) : (
                <ul>
                  {markers.map(m => (
                    <li key={m.id} onClick={() => setSelectedMarkerId(m.id)}>
                      <strong>{m.id}</strong>: {m.name}
                      {m.assignedUser && <span className="user-tag">{m.assignedUser.split('@')[0]}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for the marker edit form
interface MarkerFormProps {
  marker: { id: string; name: string; assignedUser?: string | null };
  onSave: (id: string, name: string, assignedUser: string | null) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isNew?: boolean;
}

const MarkerForm: React.FC<MarkerFormProps> = ({ marker, onSave, onCancel, onDelete, isNew }) => {
  const [id, setId] = useState(marker.id);
  const [name, setName] = useState(marker.name);
  const [user, setUser] = useState(marker.assignedUser || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(id, name, user || null);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Table ID</label>
        <input 
          type="text" 
          value={id} 
          onChange={e => setId(e.target.value)}
          placeholder="e.g., A1, B2"
          required
        />
      </div>
      <div className="form-group">
        <label>Display Name</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Window Desk"
        />
      </div>
      <div className="form-group">
        <label>Assigned User (Email)</label>
        <input 
          type="email" 
          value={user} 
          onChange={e => setUser(e.target.value)}
          placeholder="john@company.com"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {isNew ? 'Add Table' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button type="button" className="btn-danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
};
