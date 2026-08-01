// ============================================================
// Flash Fiado — VoiceConfirmDialog
// Sprint 4: Confirmación y edición de datos extraídos por voz
// Badges de campos capturados por voz vs editados manualmente
// ============================================================
import { useState, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import type { ParsedVoiceEntry } from '../../types';
import { getParseErrors } from '../../lib/voiceParser';
import './VoiceConfirmDialog.css';

interface Props {
  parsed: ParsedVoiceEntry;
  transcript: string;
  onClose: () => void;
}

export function VoiceConfirmDialog({ parsed, transcript, onClose }: Props) {
  const { addDebt } = useFirestore();

  const [cliente, setCliente]   = useState(parsed.cliente ?? '');
  const [producto, setProducto] = useState(parsed.producto ?? '');
  const [unidades, setUnidades] = useState(String(parsed.unidades ?? 1));
  const [monto, setMonto]       = useState(String(parsed.monto ?? ''));

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  // Track which fields were set by voice (vs edited manually)
  const voiceFields = useRef<Set<string>>(new Set(
    [
      parsed.cliente ? 'cliente' : '',
      parsed.producto ? 'producto' : '',
      parsed.unidades ? 'unidades' : '',
      parsed.monto ? 'monto' : '',
    ].filter(Boolean)
  ));

  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const markEdited = (field: string) => {
    setEditedFields(prev => new Set(prev).add(field));
  };

  const isVoiceFilled = (field: string) =>
    voiceFields.current.has(field) && !editedFields.has(field);

  const missingFields = getParseErrors({ ...parsed, cliente, monto: parseFloat(monto) });

  const handleConfirm = async () => {
    if (!cliente.trim()) { setError('El nombre del cliente es requerido.'); return; }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser un número mayor a 0.'); return; }

    setError('');
    setLoading(true);

    try {
      await addDebt({
        clienteNombre: cliente.trim(),
        producto: producto.trim() || undefined,
        unidades: parseInt(unidades) || 1,
        monto: montoNum,
      });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-panel voice-dialog" role="dialog" aria-modal="true" aria-label="Confirmar fiado">
        {success ? (
          <div className="dialog-success animate-fade-in">
            <div className="success-icon">✓</div>
            <p className="heading-sm">¡Fiado registrado!</p>
          </div>
        ) : (
          <>
            <div className="dialog-header">
              <h2 className="heading-md">Confirmar fiado</h2>
              <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Cerrar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Texto transcrito */}
            <div className="transcript-box">
              <span className="label-sm text-muted">Escuché:</span>
              <p className="transcript-text">"{transcript}"</p>
            </div>

            {/* Campos extraídos — editables */}
            <div className="dialog-fields">
              <div className={`input-group ${!cliente ? 'field-missing' : ''}`}>
                <label className="input-label" htmlFor="dlg-cliente">
                  Cliente {!cliente && <span className="field-required">*</span>}
                  {isVoiceFilled('cliente') && <span className="voice-badge" title="Capturado por voz">🎙️</span>}
                </label>
                <input
                  id="dlg-cliente"
                  className={`input ${!cliente ? 'error' : ''}`}
                  value={cliente}
                  onChange={(e) => { setCliente(e.target.value); markEdited('cliente'); }}
                  placeholder="Nombre del cliente"
                  autoFocus
                />
              </div>

              <div className="dialog-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label" htmlFor="dlg-unidades">
                    Unidades
                    {isVoiceFilled('unidades') && <span className="voice-badge" title="Capturado por voz">🎙️</span>}
                  </label>
                  <input
                    id="dlg-unidades"
                    className="input"
                    type="number"
                    min="1"
                    value={unidades}
                    onChange={(e) => { setUnidades(e.target.value); markEdited('unidades'); }}
                  />
                </div>

                <div className="input-group" style={{ flex: 2 }}>
                  <label className="input-label" htmlFor="dlg-producto">
                    Producto
                    {isVoiceFilled('producto') && <span className="voice-badge" title="Capturado por voz">🎙️</span>}
                  </label>
                  <input
                    id="dlg-producto"
                    className="input"
                    value={producto}
                    onChange={(e) => { setProducto(e.target.value); markEdited('producto'); }}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className={`input-group ${!monto ? 'field-missing' : ''}`}>
                <label className="input-label" htmlFor="dlg-monto">
                  Monto (S/) {!monto && <span className="field-required">*</span>}
                  {isVoiceFilled('monto') && <span className="voice-badge" title="Capturado por voz">🎙️</span>}
                </label>
                <input
                  id="dlg-monto"
                  className={`input ${!monto ? 'error' : ''}`}
                  type="number"
                  min="0.01"
                  step="0.10"
                  value={monto}
                  onChange={(e) => { setMonto(e.target.value); markEdited('monto'); }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Alerta de campos faltantes */}
            {missingFields.length > 0 && !error && (
              <p className="dialog-warning">
                Completa: {missingFields.join(', ')}
              </p>
            )}

            {error && <p className="dialog-error">{error}</p>}

            {/* Acciones */}
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={loading}>
                {loading ? <div className="spinner spinner-sm" /> : null}
                {loading ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
