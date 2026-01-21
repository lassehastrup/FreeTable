import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LocationPage } from './pages/LocationPage';
import { AdminHomePage, AdminLocationPage } from './admin';
import './App.css';

// Animated background component for public pages
const AnimatedBackground: React.FC = () => (
  <>
    <div className="animated-bg">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
    </div>
    <div className="particles">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="particle"></div>
      ))}
    </div>
    <div className="scanlines"></div>
  </>
);

// Layout wrapper that conditionally shows animated background
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  return (
    <>
      {!isAdminRoute && <AnimatedBackground />}
      {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/location/:locationId" element={<LocationPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/location/:locationId" element={<AdminLocationPage />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

export default App;
