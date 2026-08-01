// ============================================================
// Flash Fiado — VoiceFAB (Floating Action Button de Micrófono)
// Botón manual superior visible + dictado de voz de frente
// ============================================================
import { useState } from 'react';
import { useVoiceSlots } from '../../hooks/useVoiceSlots';
import { VoiceGuidedSheet } from './VoiceGuidedSheet';
import { VoiceConfirmDialog } from './VoiceConfirmDialog';
import type { ParsedVoiceEntry } from '../../types';
import './VoiceFAB.css';

export function VoiceFAB() {
  const [showSheet, setShowSheet] = useState(false);
  const [manualEntry, setManualEntry] = useState<ParsedVoiceEntry | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const voice = useVoiceSlots();

  // Al presionar el micrófono, EMPIEZA A GRABAR DIRECTAMENTE
  const handleFABClick = () => {
    if (showSheet || showConfirmDialog) return;
    setShowSheet(true);
    voice.startFree(); // Dictado directo de 1 frase
  };

  // Cerrar el sheet de voz
  const handleSheetClose = () => {
    voice.cancel();
    setShowSheet(false);
  };

  // Abrir formulario manual directo
  const handleManualOpen = () => {
    voice.cancel();
    setShowSheet(false);
    setManualEntry({ raw: 'Registro manual' });
    setShowConfirmDialog(true);
  };

  // Cerrar diálogo de confirmación
  const handleDialogClose = () => {
    setShowConfirmDialog(false);
    setManualEntry(null);
    voice.cancel();
  };

  const voiceResult = voice.result;
  const isConfirming = voice.mode === 'confirming' && voiceResult;

  const handleConfirmFromSheet = () => {
    setShowSheet(false);
    setShowConfirmDialog(true);
  };

  const isActive = showSheet || showConfirmDialog;
  const isListening = voice.isListening;

  return (
    <>
      {/* FAB centrado en la bottom nav */}
      <div className="fab-container">
        {/* Botón flotante superior para registro manual (altamente visible y cómodo) */}
        {!isActive && (
          <button
            type="button"
            className="fab-manual-pill"
            onClick={handleManualOpen}
            title="Anotar fiado manualmente sin usar voz"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>Anotar manual</span>
          </button>
        )}

        {/* Botón principal del micrófono */}
        <div className={`voice-fab ${isListening ? 'listening' : ''}`}>
          {isListening && (
            <>
              <div className="voice-ring" />
              <div className="voice-ring" />
              <div className="voice-ring" />
            </>
          )}

          <button
            id="voice-fab-btn"
            className={`voice-btn ${!voice.isSupported ? 'disabled' : ''}`}
            onClick={handleFABClick}
            disabled={!voice.isSupported || isActive}
            aria-label={isActive ? 'Escuchando dictado' : 'Dictar fiado de frente'}
            title={!voice.isSupported ? 'Usa Chrome en Android para reconocimiento de voz' : 'Dictar fiado directo'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8"  y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        </div>

        {/* Estado mientras está escuchando */}
        {isListening && (
          <span className="fab-label-listening">Escuchando…</span>
        )}
      </div>

      {/* Sheet de grabación directa */}
      {showSheet && !isConfirming && (
        <VoiceGuidedSheet
          voice={voice}
          onClose={handleSheetClose}
          onManual={handleManualOpen}
        />
      )}

      {/* Pantalla de confirmación tras dictado */}
      {showSheet && isConfirming && voiceResult && (
        <>
          <div className="guided-backdrop" onClick={handleSheetClose} />
          <div className="guided-sheet" role="dialog" aria-modal="true">
            <div className="sheet-handle" />
            <div className="sheet-complete" style={{ padding: 'var(--space-4) 0' }}>
              <div className="sheet-complete-icon">✅</div>
              <p className="heading-sm">¡Fiado interpretado!</p>
              <p className="body-sm text-secondary" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                Revisa y confirma los datos antes de guardar
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={handleSheetClose}>
                  Cancelar
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleConfirmFromSheet}>
                  Revisar y guardar →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Diálogo final de confirmación */}
      {showConfirmDialog && (
        <VoiceConfirmDialog
          parsed={manualEntry || voiceResult || { raw: '' }}
          transcript={manualEntry ? 'Registro manual' : voice.transcript || 'Dictado directo por voz'}
          onClose={handleDialogClose}
        />
      )}
    </>
  );
}
