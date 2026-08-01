// ============================================================
// Flash Fiado — VoiceGuidedSheet
// Bottom sheet con flujo de dictado guiado (paso a paso) y libre
// ============================================================
import { VOICE_SLOTS } from '../../lib/voiceCommandEngine';
import type { useVoiceSlots } from '../../hooks/useVoiceSlots';
import './VoiceGuidedSheet.css';

type VoiceSlotsReturn = ReturnType<typeof useVoiceSlots>;

interface Props {
  voice: VoiceSlotsReturn;
  onClose: () => void;
  onManual: () => void;
}

export function VoiceGuidedSheet({ voice, onClose, onManual }: Props) {
  const {
    mode,
    currentSlot,
    currentStep,
    totalSteps,
    filledSlots,
    transcript,
    interimText,
    isListening,
    isSupported,
    errorMessage,
    isTTSEnabled,
    toggleTTS,
    startGuided,
    startFree,
    confirmSlot,
    skipSlot,
    goBack,
    editSlot,
    cancel,
    stopListening,
  } = voice;

  const handleClose = () => {
    cancel();
    onClose();
  };

  // ---------------------------------------------------------------
  // Sin soporte de voz
  // ---------------------------------------------------------------
  if (!isSupported) {
    return (
      <>
        <div className="guided-backdrop" onClick={handleClose} />
        <div className="guided-sheet" role="dialog" aria-modal="true">
          <div className="sheet-handle" />
          <div className="voice-not-supported">
            <div className="voice-not-supported-icon">🎙️</div>
            <p className="heading-sm" style={{ marginBottom: 'var(--space-2)' }}>
              Voz no disponible
            </p>
            <p className="body-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
              Tu navegador no soporta reconocimiento de voz. Usa Chrome en Android o PC.
            </p>
            <button className="btn btn-primary" onClick={onManual}>
              ✏️ Anotar manualmente
            </button>
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------
  // Selector de modo (estado inicial)
  // ---------------------------------------------------------------
  if (mode === 'idle') {
    return (
      <>
        <div className="guided-backdrop" onClick={handleClose} />
        <div className="guided-sheet" role="dialog" aria-modal="true" aria-label="Seleccionar modo de dictado">
          <div className="sheet-handle" />

          <div className="sheet-header">
            <h2 className="heading-md">Registrar fiado</h2>
            <button className="btn btn-icon btn-ghost" onClick={handleClose} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="mode-selector">
            {/* Modo guiado (recomendado) */}
            <button className="mode-option" onClick={startGuided} id="mode-guided-btn">
              <div className="mode-option-icon">🎙️</div>
              <div className="mode-option-info">
                <div className="mode-option-title">Paso a paso</div>
                <div className="mode-option-desc">
                  Te guío campo por campo. Más preciso y fácil.
                </div>
              </div>
              <div className="mode-option-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>

            {/* Modo libre */}
            <button className="mode-option" onClick={startFree} id="mode-free-btn">
              <div className="mode-option-icon">💬</div>
              <div className="mode-option-info">
                <div className="mode-option-title">Dictado libre</div>
                <div className="mode-option-desc">
                  Di todo de corrido. Ej: "cliente Pablo producto gaseosa precio siete"
                </div>
              </div>
              <div className="mode-option-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>

            {/* Manual */}
            <button className="mode-option" onClick={onManual} id="mode-manual-btn">
              <div className="mode-option-icon">✏️</div>
              <div className="mode-option-info">
                <div className="mode-option-title">Manual</div>
                <div className="mode-option-desc">
                  Escribe los datos a mano en el formulario.
                </div>
              </div>
              <div className="mode-option-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------
  // Modo libre: escuchando texto completo
  // ---------------------------------------------------------------
  if (mode === 'free') {
    return (
      <>
        <div className="guided-backdrop" onClick={handleClose} />
        <div className="guided-sheet" role="dialog" aria-modal="true" aria-label="Dictado libre">
          <div className="sheet-handle" />

          <div className="sheet-header">
            <div className="sheet-header-left">
              <span className="sheet-step-label">Dictado libre</span>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={handleClose} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="free-mode-area">
            <div className="slot-icon">💬</div>
            <p className="slot-prompt-text">Dicta el fiado completo</p>
          </div>

          {/* Transcripción en vivo */}
          <div className={`live-transcript ${isListening ? 'listening' : ''}`}>
            {isListening && <span className="live-transcript-mic">🔴</span>}
            {transcript || interimText ? (
              <span className="live-transcript-text">
                {transcript || interimText}
              </span>
            ) : (
              <span className="live-transcript-placeholder">
                {isListening ? 'Escuchando...' : 'Presiona para hablar'}
              </span>
            )}
          </div>

          <div className="free-mode-hint">
            <p>Usa palabras clave para mejor precisión:</p>
            <p>
              <strong>"cliente"</strong> Pablo <strong>"producto"</strong> gaseosa{' '}
              <strong>"unidades"</strong> dos <strong>"precio"</strong> siete
            </p>
          </div>

          {errorMessage && (
            <p className="dialog-error" style={{ marginTop: 'var(--space-3)' }}>
              {errorMessage}
            </p>
          )}

          <div className="sheet-actions" style={{ marginTop: 'var(--space-4)' }}>
            <button className="btn btn-ghost" onClick={handleClose}>
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={stopListening}
              disabled={!isListening}
            >
              {isListening ? '⏹️ Detener' : 'Procesando...'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------
  // Modo guiado: paso a paso
  // ---------------------------------------------------------------
  if (mode === 'guided') {
    return (
      <>
        <div className="guided-backdrop" />
        <div className="guided-sheet" role="dialog" aria-modal="true" aria-label="Dictado paso a paso">
          <div className="sheet-handle" />

          {/* Header */}
          <div className="sheet-header">
            <div className="sheet-header-left">
              <span className="sheet-step-label">
                Paso {Math.min(currentStep + 1, totalSteps)} de {totalSteps}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={onManual}
                style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                title="Cambiar a ingreso manual"
              >
                ✏️ Manual
              </button>
              <button
                className={`sheet-tts-toggle ${isTTSEnabled ? 'active' : ''}`}
                onClick={toggleTTS}
                title={isTTSEnabled ? 'Desactivar voz guía' : 'Activar voz guía'}
              >
                {isTTSEnabled ? '🔊' : '🔇'}
              </button>
              <button className="btn btn-icon btn-ghost" onClick={handleClose} aria-label="Cerrar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="sheet-progress">
            {VOICE_SLOTS.map((slot, i) => (
              <div
                key={slot.key}
                className={`progress-segment ${
                  i < currentStep
                    ? 'completed'
                    : i === currentStep
                    ? 'active'
                    : ''
                }`}
              />
            ))}
          </div>

          {/* Prompt del slot actual */}
          {currentSlot && !voice.slotState.isComplete && (
            <div className="slot-prompt-area">
              <span className="slot-icon">{currentSlot.icon}</span>
              <p className="slot-prompt-text">{currentSlot.prompt}</p>
            </div>
          )}

          {/* Área de transcripción en vivo */}
          {!voice.slotState.isComplete && (
            <div className={`live-transcript ${isListening ? 'listening' : ''}`}>
              {isListening && <span className="live-transcript-mic">🔴</span>}
              {transcript || interimText ? (
                <span className="live-transcript-text">
                  {transcript || interimText}
                </span>
              ) : (
                <span className="live-transcript-placeholder">
                  {isListening ? 'Escuchando...' : 'Esperando...'}
                </span>
              )}
            </div>
          )}

          {/* Completado */}
          {voice.slotState.isComplete && (
            <div className="sheet-complete">
              <div className="sheet-complete-icon">✅</div>
              <p className="heading-sm">¡Datos capturados!</p>
              <p className="body-sm text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                Revisa los campos y confirma
              </p>
            </div>
          )}

          {/* Slot cards */}
          <div className="slot-cards">
            {VOICE_SLOTS.map((slot, i) => {
              const value = filledSlots[slot.key];
              const isCompleted = value !== undefined && value !== '';
              const isActive = i === currentStep && !voice.slotState.isComplete;
              const isPending = i > currentStep && !voice.slotState.isComplete;

              return (
                <button
                  key={slot.key}
                  className={`slot-card ${isCompleted ? 'completed' : ''} ${
                    isActive ? 'active' : ''
                  } ${isPending ? 'pending' : ''}`}
                  onClick={() => editSlot(i)}
                  disabled={isPending}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="slot-card-status">
                    {isCompleted ? '✅' : isActive ? '🎙️' : '⬜'}
                  </div>
                  <div className="slot-card-info">
                    <div className="slot-card-label">
                      {slot.label}
                      {slot.required && !isCompleted && (
                        <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>
                      )}
                    </div>
                    <div className={`slot-card-value ${!isCompleted ? 'empty' : ''}`}>
                      {isCompleted
                        ? slot.key === 'monto'
                          ? `S/ ${value}`
                          : String(value)
                        : isActive
                        ? 'Escuchando...'
                        : '—'}
                    </div>
                  </div>
                  {isCompleted && (
                    <div className="slot-card-edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {errorMessage && (
            <p className="dialog-error">{errorMessage}</p>
          )}

          {/* Acciones */}
          <div className="sheet-actions">
            {currentStep > 0 && !voice.slotState.isComplete && (
              <button className="btn btn-ghost sheet-actions btn-back" onClick={goBack}>
                ← Atrás
              </button>
            )}

            {!voice.slotState.isComplete && currentSlot && !currentSlot.required && (
              <button className="btn btn-ghost" onClick={skipSlot}>
                Saltar
              </button>
            )}

            {!voice.slotState.isComplete && (
              <button
                className="btn btn-primary btn-lg"
                onClick={confirmSlot}
                disabled={!filledSlots[currentSlot?.key ?? '']}
              >
                Siguiente →
              </button>
            )}

            {voice.slotState.isComplete && (
              <>
                <button className="btn btn-ghost" onClick={handleClose}>
                  Cancelar
                </button>
                <button className="btn btn-primary btn-lg" onClick={() => {/* handled by parent via result */}}>
                  Confirmar ✓
                </button>
              </>
            )}
          </div>

          {/* Tip de comandos de voz */}
          {!voice.slotState.isComplete && (
            <p className="free-mode-hint" style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
              Di <strong>"atrás"</strong>, <strong>"saltar"</strong> o <strong>"cancelar"</strong> para navegar
            </p>
          )}
        </div>
      </>
    );
  }

  // Modo confirming se maneja externamente con VoiceConfirmDialog
  return null;
}
