// ============================================================
// Flash Fiado — ClientCard Component
// ============================================================
import { useNavigate } from 'react-router-dom';
import type { Client } from '../../types';
import { formatCurrency, formatRelativeDate, getDebtLevel } from '../../utils/format';
import './ClientCard.css';

interface Props {
  client: Client;
  index?: number;
}

export function ClientCard({ client, index = 0 }: Props) {
  const navigate = useNavigate();
  const level = getDebtLevel(client.deudaTotal);

  return (
    <div
      className={`client-card card card-interactive animate-fade-up`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => navigate(`/clientes/${client.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/clientes/${client.id}`)}
      aria-label={`Ver fiado de ${client.nombre}`}
    >
      {/* Avatar con inicial */}
      <div className={`client-avatar avatar-${level}`}>
        {client.nombre.charAt(0).toUpperCase()}
      </div>

      <div className="client-info">
        <p className="client-name">{client.nombre}</p>
        {client.fechaUltimoMovimiento && (
          <p className="client-date text-muted body-sm">
            {formatRelativeDate(client.fechaUltimoMovimiento)}
          </p>
        )}
      </div>

      <div className="client-debt">
        <p className={`debt-amount debt-${level}`}>
          {formatCurrency(client.deudaTotal)}
        </p>
        <div className={`debt-indicator indicator-${level}`} />
      </div>

      {/* Flecha */}
      <svg className="client-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  );
}
