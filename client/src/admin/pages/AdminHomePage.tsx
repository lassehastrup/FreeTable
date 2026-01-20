import React from 'react';
import { Link } from 'react-router-dom';
import './AdminHomePage.css';

export const AdminHomePage: React.FC = () => {
  // In a real app, you'd load existing locations here
  const existingLocations = [
    { id: 'aarhus', name: 'Aarhus Office' },
    { id: 'skanderborg', name: 'Skanderborg Office' },
  ];

  return (
    <div className="admin-home-page">
      <header className="admin-home-header">
        <div className="header-left">
          <h1>🛠️ FreeTable Admin</h1>
          <p>Configure office locations and table mappings</p>
        </div>
        <Link to="/" className="view-dashboard-link">
          View Live Dashboard →
        </Link>
      </header>

      <main className="admin-home-content">
        <section className="locations-section">
          <div className="section-header">
            <h2>Locations</h2>
            <Link to="/admin/location/new" className="btn-add">
              + Add New Location
            </Link>
          </div>

          <div className="locations-grid">
            {existingLocations.map(location => (
              <Link 
                key={location.id} 
                to={`/admin/location/${location.id}`}
                className="location-card"
              >
                <span className="location-icon">🏢</span>
                <span className="location-name">{location.name}</span>
                <span className="location-action">Edit →</span>
              </Link>
            ))}

            <Link to="/admin/location/new" className="location-card add-new">
              <span className="add-icon">+</span>
              <span className="add-label">Create New Location</span>
            </Link>
          </div>
        </section>

        <section className="help-section">
          <h2>📖 Quick Guide</h2>
          <div className="help-grid">
            <div className="help-card">
              <h3>1. Upload Floor Plan</h3>
              <p>Upload an image of your office layout (PNG, JPG, or SVG)</p>
            </div>
            <div className="help-card">
              <h3>2. Place Table Markers</h3>
              <p>Click on the image to position tables and assign users</p>
            </div>
            <div className="help-card">
              <h3>3. Export Config</h3>
              <p>Save the generated JSON to your location folder</p>
            </div>
            <div className="help-card">
              <h3>4. Fetch Availability</h3>
              <p>Run the PowerShell script to pull calendar data</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
