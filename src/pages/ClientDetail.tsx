// ============================================================
// Flash Fiado — ClientDetail Page
// Sprint 2: Historial de movimientos por cliente
// Opción discreta de eliminación con bloqueo estricto si hay deuda
// ============================================================
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { OfflineBanner } from '../components/layout/OfflineBanner';
import { useFirestore } from '../hooks/useFirestore';
import { useClientStore } from '../store/clientStore';
import { formatCurrency, formatDateTime, getDebtLevel } from '../utils/format';
import type { Movement } from '../types';
import './ClientDetail.css';

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { subscribeClients, subscribeMovements, addPayment, deleteClient } = useFirestore();
  const { clients, movements, setMovements } = useClientStore();

  const client = clients.find((c) => c.id === clientId);

  const [showPayForm, setShowPayForm]       = useState(false);
  const [payAmount, setPayAmount]           = useState('');
  const [payLoading, setPayLoading]         = useState(false);
  const [payError, setPayError]             = useState('');

  // Estado del modal de eliminación discreto
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [deleteError, setDeleteError]         = useState('');

  // Suscribirse a la lista de clientes para mantener sincronizada la deuda total
  useEffect(() => {
    const unsub = subscribeClients();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!clientId) return;
    setMovements([]);
    const unsub = subscribeMovements(clientId);
    return () => unsub();
  }, [clientId]);

  const handlePayment = async () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Ingresa un monto válido mayor a 0.');
      return;
    }
    if (!clientId) return;

    setPayError('');
    setPayLoading(true);
    try {
      await addPayment({ clientId, monto: amount });
      setPayAmount('');
      setShowPayForm(false);
    } catch {
      setPayError('Error al registrar el abono. Intenta de nuevo.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!clientId || !client) return;
    if (client.deudaTotal > 0) return; // Bloqueo estricto

    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteClient(clientId);
      setShowDeleteModal(false);
      navigate('/clientes', { replace: true });
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar el cliente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const level = getDebtLevel(client?.deudaTotal ?? 0);
  const hasActiveDebt = (client?.deudaTotal ?? 0) > 0;

  return (
    <div className="app-shell">
      {/* Header con botón discreto de papelera (baja opacidad para evitar clicks accidentales) */}
      <Header
        title={client?.nombre ?? 'Cliente'}
        showBack
        rightAction={
          client ? (
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setShowDeleteModal(true)}
              aria-label="Opción de cliente"
              title="Opciones de cliente"
              style={{ opacity: 0.35, padding: '6px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          ) : null
        }
      />
      <OfflineBanner />

      <main className="page-content">
        {/* Tarjeta de resumen del cliente */}
        {client && (
          <section className="client-summary-card card card-accent animate-fade-up">
            <div className={`client-detail-avatar avatar-${level}`}>
              {client.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="heading-lg">{client.nombre}</h2>
              <p className={`debt-total debt-${level}`}>{formatCurrency(client.deudaTotal)}</p>
              <p className="body-sm text-muted">deuda pendiente</p>
            </div>

            {client.deudaTotal > 0 && (
              <button
                className="btn btn-success pay-btn"
                onClick={() => setShowPayForm(!showPayForm)}
                id="register-payment-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Registrar abono
              </button>
            )}
          </section>
        )}

        {/* Formulario de abono inline */}
        {showPayForm && (
          <div className="pay-form card animate-fade-up">
            <p className="heading-sm" style={{ marginBottom: 'var(--space-4)' }}>Registrar abono</p>
            <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="input-label" htmlFor="pay-amount">Monto abonado (S/)</label>
              <input
                id="pay-amount"
                className="input"
                type="number"
                min="0.01"
                step="0.10"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {payError && <p className="dialog-error">{payError}</p>}
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={() => setShowPayForm(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={handlePayment} disabled={payLoading} style={{ flex: 1 }}>
                {payLoading ? <div className="spinner spinner-sm" /> : '✓ Confirmar abono'}
              </button>
            </div>
          </div>
        )}

        {/* Timeline de movimientos */}
        <section className="movements-section animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h3 className="heading-sm" style={{ marginBottom: 'var(--space-4)' }}>Historial</h3>

          {movements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="body-sm text-muted">Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="timeline">
              {movements.map((m, i) => (
                <MovementItem key={m.id} movement={m} isLast={i === movements.length - 1} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal Discreto de Eliminación con Regla de Deuda Cero */}
      {showDeleteModal && client && (
        <>
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)} />
          <div className="delete-modal-panel">
            {hasActiveDebt ? (
              /* CASO A: BLOQUEO POR DEUDA ACTIVA */
              <div className="delete-restricted-view">
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⚠️</div>
                <h3 className="heading-md" style={{ marginBottom: 'var(--space-2)' }}>No se puede eliminar</h3>
                <p className="body-sm text-secondary" style={{ marginBottom: 'var(--space-4)', lineHeight: '1.5' }}>
                  <strong>{client.nombre}</strong> tiene una deuda pendiente de{' '}
                  <span className="text-danger" style={{ fontWeight: 700 }}>
                    {formatCurrency(client.deudaTotal)}
                  </span>
                  .<br />
                  Debe abonar el monto total antes de poder eliminar su registro.
                </p>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowDeleteModal(false)}
                  style={{ width: '100%' }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              /* CASO B: DEUDA CERO (PERMITIR ELIMINAR CON CONFIRMACIÓN) */
              <div className="delete-confirm-view">
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🗑️</div>
                <h3 className="heading-md" style={{ marginBottom: 'var(--space-2)' }}>¿Eliminar cliente?</h3>
                <p className="body-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
                  ¿Estás seguro de eliminar a <strong>{client.nombre}</strong>?<br />
                  Esta acción no se puede deshacer.
                </p>

                {deleteError && (
                  <p className="dialog-error" style={{ marginBottom: 'var(--space-3)' }}>{deleteError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteLoading}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteConfirm}
                    disabled={deleteLoading}
                    style={{ flex: 1 }}
                  >
                    {deleteLoading ? <div className="spinner spinner-sm" /> : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// MovementItem sub-componente
// ----------------------------------------------------------------
function MovementItem({ movement, isLast }: { movement: Movement; isLast: boolean }) {
  const isDebt = movement.tipo === 'deuda';

  return (
    <div className={`movement-item ${isLast ? 'last' : ''}`}>
      {/* Línea de timeline */}
      <div className="timeline-connector">
        <div className={`timeline-dot dot-${isDebt ? 'debt' : 'payment'}`} />
        {!isLast && <div className="timeline-line" />}
      </div>

      {/* Contenido */}
      <div className="movement-content card" style={{ flex: 1, marginBottom: 'var(--space-3)' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge ${isDebt ? 'badge-danger' : 'badge-success'}`}>
                {isDebt ? 'Fiado' : 'Abono'}
              </span>
              {movement.producto && (
                <span className="body-sm text-secondary">{movement.unidades}× {movement.producto}</span>
              )}
            </div>
            <p className="body-sm text-muted" style={{ marginTop: 'var(--space-1)' }}>
              {formatDateTime(movement.fecha)} · {movement.registradoPor}
            </p>
          </div>
          <p className={`movement-amount ${isDebt ? 'text-danger' : 'text-success'}`}>
            {isDebt ? '+' : '-'}{formatCurrency(movement.monto)}
          </p>
        </div>
      </div>
    </div>
  );
}
