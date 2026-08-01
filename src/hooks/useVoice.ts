// ============================================================
// Flash Fiado — useVoice Hook
// Sprint 3+: Web Speech API (es-PE) con soporte para modo guiado
// ============================================================
import { useState, useRef, useCallback } from 'react';
import type { VoiceState } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceOptions {
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (error: string) => void;
  /** Si true, reinicia la escucha automáticamente tras capturar un resultado (modo guiado) */
  autoRestart?: boolean;
  /** Ms de silencio antes de considerar el dictado como completo. Default: 2000 */
  silenceTimeout?: number;
  /** Idioma de reconocimiento. Default: 'es-PE' */
  lang?: string;
}

export function useVoice({
  onResult,
  onInterim,
  onError,
  autoRestart = false,
  silenceTimeout = 2000,
  lang = 'es-PE',
}: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRestartRef = useRef(autoRestart);
  const isExplicitListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');

  // Mantener autoRestart actualizado
  autoRestartRef.current = autoRestart;

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    isExplicitListeningRef.current = false;
    clearSilenceTimer();
    autoRestartRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar
      }
    }
    setState('idle');
  }, [clearSilenceTimer]);

  const reset = useCallback(() => {
    isExplicitListeningRef.current = false;
    clearSilenceTimer();
    autoRestartRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignorar
      }
    }
    finalTranscriptRef.current = '';
    setState('idle');
    setTranscript('');
    setErrorMessage('');
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const msg = 'Tu navegador no soporta reconocimiento de voz. Usa Chrome en Android o PC.';
      setErrorMessage(msg);
      setState('error');
      onError?.(msg);
      return;
    }

    // Limpiar reconocimiento previo
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignorar
      }
    }

    clearSilenceTimer();
    isExplicitListeningRef.current = true;
    finalTranscriptRef.current = '';

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => {
      setState('listening');
      setTranscript('');
      setErrorMessage('');
    };

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      clearSilenceTimer();

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      const text = finalTranscriptRef.current || currentInterim;
      setTranscript(text);

      if (currentInterim) {
        onInterim?.(currentInterim);
      }

      if (finalTranscriptRef.current.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          const resultText = finalTranscriptRef.current.trim();
          setState('processing');
          isExplicitListeningRef.current = false;
          onResult?.(resultText);

          try {
            recognition.stop();
          } catch {
            // Ignorar
          }
        }, silenceTimeout);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;

      // 'no-speech' es común en Android cuando hay 1s de silencio.
      // Si el usuario aún desea escuchar, reintentamos en onend sin marcar error fatal.
      if (event.error === 'no-speech') {
        if (isExplicitListeningRef.current && !finalTranscriptRef.current) {
          return;
        }
        if (finalTranscriptRef.current) {
          const resultText = finalTranscriptRef.current.trim();
          setState('processing');
          isExplicitListeningRef.current = false;
          onResult?.(resultText);
          return;
        }
      }

      console.warn('[useVoice] Error en Web Speech API:', event.error);
      clearSilenceTimer();

      const msg = getSpeechErrorMessage(event.error);
      setErrorMessage(msg);
      setState('error');
      isExplicitListeningRef.current = false;
      onError?.(msg);
    };

    recognition.onend = () => {
      clearSilenceTimer();

      // En Android Chrome, el reconocedor nativo se detiene agresivamente tras silencios breves.
      // Si el usuario sigue en modo de escucha explícita y no se completó el resultado, reiniciar.
      if (isExplicitListeningRef.current && !finalTranscriptRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Si falla al reiniciar, continuar al cierre normal
        }
      }

      if (autoRestartRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Ignorar
        }
      }

      setState((prev) => {
        if (prev === 'listening' && finalTranscriptRef.current) {
          onResult?.(finalTranscriptRef.current.trim());
          return 'processing';
        }
        return prev === 'listening' ? 'idle' : prev;
      });
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e: any) {
      console.error('[useVoice] Error al iniciar reconocimiento:', e);
      setErrorMessage('No se pudo iniciar el micrófono.');
      setState('error');
      isExplicitListeningRef.current = false;
    }
  }, [isSupported, onResult, onInterim, onError, clearSilenceTimer, silenceTimeout, lang]);

  const restartListening = useCallback(() => {
    clearSilenceTimer();
    setTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignorar
      }
    }

    startListening();
  }, [clearSilenceTimer, startListening]);

  return {
    state,
    transcript,
    errorMessage,
    isSupported,
    isListening: state === 'listening',
    isProcessing: state === 'processing',
    startListening,
    stopListening,
    restartListening,
    reset,
  };
}

// Mensajes de error de reconocimiento de voz en español
function getSpeechErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No se escuchó voz. Habla más fuerte e intenta de nuevo.';
    case 'audio-capture':
      return 'No se pudo acceder al micrófono del dispositivo.';
    case 'not-allowed':
      return 'Permiso de micrófono denegado en el navegador.';
    case 'network':
      return 'Error de red o conexión bloqueada con el servicio de voz.';
    case 'aborted':
      return 'Reconocimiento cancelado.';
    default:
      return 'Error al reconocer la voz. Intenta de nuevo.';
  }
}
