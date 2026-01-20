import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LocationPage } from './pages/LocationPage';
import { AdminHomePage, AdminLocationPage } from './admin';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/location/:locationId" element={<LocationPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="/admin/location/:locationId" element={<AdminLocationPage />} />
      </Routes>
    </Router>
  );
};

export default App;
