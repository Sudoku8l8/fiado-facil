// ============================================================
// Flash Fiado — VoiceConfirmDialog
// Sprint 4: Confirmación y edición de datos (Soporte Multi-Producto)
// ============================================================
import { useState, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import type { ParsedVoiceEntry, MovementItem } from '../../types';
import { getParseErrors } from '../../lib/voiceParser';
import './VoiceConfirmDialog.css';

interface Props {
  parsed: ParsedVoiceEntry;
  transcript: string;
  onClose: () => void;
}

export function VoiceConfirmDialog({ parsed, transcript, onClose }: Props) {
  const { addDebt } = useFirestore();

  const [cliente, setCliente] = useState(parsed.cliente ?? '');
  const [monto, setMonto]     = useState(String(parsed.monto ?? ''));

  // Inicializar lista de productos
  const initialItems: MovementItem[] =
    parsed.items && parsed.items.length > 0
      ? parsed.items
      : parsed.producto
      ? [{ producto: parsed.producto, unidades: parsed.unidades || 1 }]
      : [{ producto: '', unidades: 1 }];

  const [items, setItems] = useState<MovementItem[]>(initialItems);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  // Rastrear campos capturados por voz vs editados manualmente
  const voiceFields = useRef<Set<string>>(new Set(
    [
      parsed.cliente ? 'cliente' : '',
      parsed.items && parsed.items.length > 0 ? 'items' : parsed.producto ? 'producto' : '',
      parsed.monto ? 'monto' : '',
    ].filter(Boolean)
  ));

  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const markEdited = (field: string) => {
    setEditedFields(prev => new Set(prev).add(field));
  };

  const isVoiceFilled = (field: string) =>
    voiceFields.current.has(field) && !editedFields.has(field);

  // Manejar cambios en la lista dinámica de ítems
  const handleItemChange = (index: number, field: keyof MovementItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    markEdited('items');
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { producto: '', unidades: 1 }]);
    markEdited('items');
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
    markEdited('items');
  };

  const missingFields = getParseErrors({ cliente, monto: parseFloat(monto), raw: transcript });

  const handleConfirm = async () => {
    if (!cliente.trim()) { setError('El nombre del cliente es requerido.'); return; }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser un número mayor a 0.'); return; }

    const validItems = items.filter(i => i.producto.trim().length > 0);

    setError('');
    setLoading(true);

    try {
      await addDebt({
        clienteNombre: cliente.trim(),
        items: validItems,
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

            {/* Campos extraídos / editables */}
            <div className="dialog-fields">
              {/* Cliente */}
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

              {/* Sección Dinámica de Productos */}
              <div className="items-section">
                <div className="items-section-header">
                  <label className="input-label">
                    Productos ({items.length})
                    {isVoiceFilled('items') && <span className="voice-badge" title="Capturado por voz">🎙️</span>}
                  </label>
                </div>

                <div className="items-list">
                  {items.map((item, idx) => (
                    <div key={idx} className="item-row">
                      <div className="input-group item-qty">
                        <label className="input-label-sub">Cant.</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={item.unidades}
                          onChange={(e) => handleItemChange(idx, 'unidades', Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>

                      <div className="input-group item-name">
                        <label className="input-label-sub">Producto</label>
                        <input
                          className="input"
                          value={item.producto}
                          onChange={(e) => handleItemChange(idx, 'producto', e.target.value)}
                          placeholder="Ej. Gaseosa"
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost btn-remove-item"
                          onClick={() => handleRemoveItem(idx)}
                          title="Eliminar producto"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-add-item"
                  onClick={handleAddItem}
                >
                  + Agregar otro producto
                </button>
              </div>

              {/* Monto Total */}
              <div className={`input-group ${!monto ? 'field-missing' : ''}`}>
                <label className="input-label" htmlFor="dlg-monto">
                  Monto Total (S/) {!monto && <span className="field-required">*</span>}
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
