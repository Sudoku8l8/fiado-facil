// ============================================================
// Flash Fiado — Dashboard Page
// Sprint 2: Resumen general de deudas + lista de clientes
// ============================================================
import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OfflineBanner } from '../components/layout/OfflineBanner';
import { VoiceFAB } from '../components/voice/VoiceFAB';
import { ClientCard } from '../components/clients/ClientCard';
import { useFirestore } from '../hooks/useFirestore';
import { useClientStore } from '../store/clientStore';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/format';
import './Dashboard.css';

type SortOption = 'deuda' | 'nombre' | 'fecha';

export function Dashboard() {
  const { appUser } = useAuth();
  const { subscribeClients } = useFirestore();
  const { clients, loading, searchQuery, setSearchQuery, getTotalDebt, getFilteredClients } = useClientStore();
  const [sort, setSort] = useState<SortOption>('deuda');

  useEffect(() => {
    const unsub = subscribeClients();
    return () => unsub();
  }, [appUser?.storeName]);

  const filtered = getFilteredClients();

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'deuda')  return b.deudaTotal - a.deudaTotal;
    if (sort === 'nombre') return a.nombre.localeCompare(b.nombre, 'es-PE');
    // fecha
    const fa = a.fechaUltimoMovimiento?.getTime() ?? 0;
    const fb = b.fechaUltimoMovimiento?.getTime() ?? 0;
    return fb - fa;
  });

  const totalDebt = getTotalDebt();
  const activeClients = clients.filter((c) => c.deudaTotal > 0).length;

  return (
    <div className="app-shell">
      <Header title={appUser?.storeName ?? 'Flash Fiado'} />
      <OfflineBanner />

      <main className="page-content" id="main-content">
        {/* Tarjeta de resumen total */}
        <section className="summary-card card card-accent animate-fade-up" aria-label="Resumen de deudas">
          <p className="label-sm text-muted">Total adeudado</p>
          <p className="summary-amount display-md">{formatCurrency(totalDebt)}</p>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{activeClients}</span>
              <span className="stat-label text-muted body-sm">con deuda</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">{clients.length}</span>
              <span className="stat-label text-muted body-sm">clientes</span>
            </div>
          </div>
        </section>

        {/* Buscador */}
        <div className="search-bar animate-fade-up" style={{ animationDelay: '80ms' }}>
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
            id="client-search"
          />
        </div>

        {/* Ordenamiento */}
        <div className="sort-tabs animate-fade-up" style={{ animationDelay: '120ms' }} role="group" aria-label="Ordenar por">
          {(['deuda', 'nombre', 'fecha'] as SortOption[]).map((opt) => (
            <button
              key={opt}
              className={`sort-tab ${sort === opt ? 'active' : ''}`}
              onClick={() => setSort(opt)}
            >
              {opt === 'deuda' ? 'Mayor deuda' : opt === 'nombre' ? 'Nombre' : 'Reciente'}
            </button>
          ))}
        </div>

        {/* Lista de clientes */}
        <section className="clients-section" aria-label="Lista de clientes">
          {loading ? (
            <div className="skeleton-list">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty-state animate-fade-in">
              <div className="empty-icon">📋</div>
              <p className="heading-sm">
                {searchQuery ? 'Sin resultados' : 'Sin clientes aún'}
              </p>
              <p className="body-sm text-muted">
                {searchQuery
                  ? `No se encontró "${searchQuery}"`
                  : 'Usa el micrófono para registrar tu primer fiado'}
              </p>
            </div>
          ) : (
            <div className="clients-list">
              {sorted.map((client, i) => (
                <ClientCard key={client.id} client={client} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
      <VoiceFAB />
    </div>
  );
}
