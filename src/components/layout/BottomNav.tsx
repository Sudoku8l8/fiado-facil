// ============================================================
// Flash Fiado — BottomNav Component
// ============================================================
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

export function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación principal">
      <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        <span className="nav-label">Inicio</span>
      </NavLink>

      {/* Espacio central para el FAB */}
      <div className="nav-fab-space" aria-hidden="true" />

      <NavLink to="/clientes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span className="nav-label">Clientes</span>
      </NavLink>
    </nav>
  );
}
