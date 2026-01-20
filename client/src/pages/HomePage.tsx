import React, { useEffect, useState } from 'react';
import { fetchLocations } from '../services/api';
import { Location } from '../types';
import { LocationCard } from '../components/LocationCard';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await fetchLocations();
        setLocations(data);
      } catch (err) {
        setError('Failed to load locations. Please run the PowerShell script first.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, []);

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="error-container">
          <h2>⚠️ Data Not Available</h2>
          <p>{error}</p>
          <div className="help-text">
            <p>Run the following command to fetch availability data:</p>
            <code>cd scripts && pwsh ./Get-TableAvailability.ps1</code>
          </div>
        </div>
      </div>
    );
  }

  const totalAvailable = locations.reduce(
    (sum, loc) => sum + loc.tables.filter(t => t.isAvailable).length, 
    0
  );
  const totalTables = locations.reduce((sum, loc) => sum + loc.tables.length, 0);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>🪑 FreeTable</h1>
        <p className="subtitle">Find an available desk at the office</p>
        <div className="global-stats">
          <span className="stat-highlight">{totalAvailable}</span>
          <span> of {totalTables} desks available across all locations</span>
        </div>
      </header>

      <main className="locations-grid">
        {locations.length === 0 ? (
          <p className="no-locations">No locations configured yet.</p>
        ) : (
          locations.map(location => (
            <LocationCard key={location.id} location={location} />
          ))
        )}
      </main>
    </div>
  );
};
