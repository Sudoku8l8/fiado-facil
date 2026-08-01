// ============================================================
// Flash Fiado — Clients List Page
// Alias para mostrar todos los clientes con búsqueda completa
// ============================================================
import { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OfflineBanner } from '../components/layout/OfflineBanner';
import { VoiceFAB } from '../components/voice/VoiceFAB';
import { ClientCard } from '../components/clients/ClientCard';
import { useFirestore } from '../hooks/useFirestore';
import { useClientStore } from '../store/clientStore';
import { useAuth } from '../hooks/useAuth';
import './ClientsList.css';

export function ClientsList() {
  const { appUser } = useAuth();
  const { subscribeClients } = useFirestore();
  const { loading, searchQuery, setSearchQuery, getFilteredClients } = useClientStore();

  useEffect(() => {
    const unsub = subscribeClients();
    return () => unsub();
  }, [appUser?.uid]);

  const filtered = getFilteredClients();
  const sorted = [...filtered].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es-PE')
  );

  return (
    <div className="app-shell">
      <Header title="Clientes" />
      <OfflineBanner />

      <main className="page-content">
        {/* Buscador */}
        <div className="search-bar animate-fade-up" style={{ marginBottom: 'var(--space-4)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-icon">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="search-input"
            type="search"
            placeholder="Buscar cliente…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar cliente"
            id="clients-search"
          />
        </div>

        {loading ? (
          <div className="skeleton-list">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon">👤</div>
            <p className="heading-sm">
              {searchQuery ? 'Sin resultados' : 'Sin clientes aún'}
            </p>
            <p className="body-sm text-muted">
              {searchQuery ? `No se encontró "${searchQuery}"` : 'Registra tu primer fiado con el micrófono'}
            </p>
          </div>
        ) : (
          <div className="clients-list animate-stagger">
            {sorted.map((client, i) => (
              <ClientCard key={client.id} client={client} index={i} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
      <VoiceFAB />
    </div>
  );
}
