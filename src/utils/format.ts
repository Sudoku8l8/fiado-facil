// ============================================================
// Flash Fiado — Funciones de formato
// ============================================================

/** Formatea un número como moneda PEN (S/) */
export function formatCurrency(amount: number): string {
  if (amount === 0) return 'S/ 0.00';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Retorna el nivel de deuda para colorear elementos */
export function getDebtLevel(amount: number): 'zero' | 'low' | 'medium' | 'high' {
  if (amount <= 0)  return 'zero';
  if (amount < 20)  return 'low';
  if (amount < 100) return 'medium';
  return 'high';
}

/** Formatea una fecha de forma relativa en español */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays  = Math.floor(diffMs / 86_400_000);

  if (diffMins  < 1)   return 'Ahora mismo';
  if (diffMins  < 60)  return `Hace ${diffMins} min`;
  if (diffHours < 24)  return `Hace ${diffHours}h`;
  if (diffDays  === 1) return 'Ayer';
  if (diffDays  < 7)   return `Hace ${diffDays} días`;
  if (diffDays  < 30)  return `Hace ${Math.floor(diffDays / 7)} sem`;
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

/** Formatea hora para timeline de movimientos */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
