// ============================================================
// Flash Fiado — Header Component
// ============================================================
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import './Header.css';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title = 'Flash Fiado', showBack = false }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { appUser, signOut } = useAuth();
  const { isOnline } = useOfflineQueue();

  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack ? (
          <button className="btn btn-icon btn-ghost header-back" onClick={() => navigate(-1)} aria-label="Volver">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        ) : (
          <div className="header-logo">
            <span className="logo-icon">⚡</span>
          </div>
        )}
      </div>

      <h1 className="header-title">{title}</h1>

      <div className="header-right">
        {/* Indicador de conexión */}
        <div
          className={`connection-dot ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'En línea' : 'Sin conexión'}
        />

        {isDashboard && appUser && (
          <button className="btn btn-icon btn-ghost" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
