// ============================================================
// Flash Fiado — OfflineBanner Component
// ============================================================
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import './OfflineBanner.css';

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`offline-banner ${isOnline ? 'syncing' : 'offline'}`} role="alert">
      {isOnline ? (
        <>
          <div className="offline-spinner" />
          <span>Sincronizando {pendingCount} registro{pendingCount !== 1 ? 's' : ''}…</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
          </svg>
          <span>Sin conexión — los cambios se guardarán al reconectar</span>
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount}</span>
          )}
        </>
      )}
    </div>
  );
}
