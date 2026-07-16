import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Shield, Upload, BarChart3, Home } from 'lucide-react';
import { ClaimProvider } from './context/ClaimContext';
import HomePage from './pages/HomePage';
import SubmitClaimPage from './pages/SubmitClaimPage';
import DashboardPage from './pages/DashboardPage';
import ClaimDetailPage from './pages/ClaimDetailPage';
import ProcessingPage from './pages/ProcessingPage';
import './App.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <div className="navbar-brand-icon">
            <Shield size={20} />
          </div>
          <span className="navbar-brand-text">
            Auto<span>Claim</span> AI
          </span>
        </NavLink>
        <ul className="navbar-nav">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <Home size={16} />
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/submit" className={({ isActive }) => isActive ? 'active' : ''}>
              <Upload size={16} />
              Submit Claim
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              <BarChart3 size={16} />
              Dashboard
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <ClaimProvider>
      <HashRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit" element={<SubmitClaimPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/claim/:id" element={<ClaimDetailPage />} />
          <Route path="/processing/:id" element={<ProcessingPage />} />
        </Routes>
      </HashRouter>
    </ClaimProvider>
  );
}
