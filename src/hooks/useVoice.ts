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
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRestartRef = useRef(autoRestart);

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

  const startListening = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Tu navegador no soporta reconocimiento de voz. Usa Chrome en Android o PC.';
      setErrorMessage(msg);
      setState('error');
      onError?.(msg);
      return;
    }

    // Solicitar permiso de micrófono primero para evitar cierres instantáneos por falta de permiso
    try {
      if (!streamRef.current && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
    } catch (err: any) {
      console.warn('[useVoice] Permiso de micrófono denegado o no disponible:', err);
      const msg = 'Permiso de micrófono denegado o no disponible.';
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

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.lang = lang;
    recognition.interimResults = true; // Permite ver la transcripción mientras hablas
    recognition.maxAlternatives = 1;
    recognition.continuous = true;     // Evita que se cierre tras 1 segundo de silencio

    let finalTranscript = '';

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
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || currentInterim;
      setTranscript(text);

      // Enviar interinos para feedback en tiempo real
      if (currentInterim) {
        onInterim?.(currentInterim);
      }

      // Si tenemos un resultado final, iniciar silence timer
      if (finalTranscript.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          setState('processing');
          onResult?.(finalTranscript.trim());

          if (!autoRestartRef.current) {
            try {
              recognition.stop();
            } catch {
              // Ignorar
            }
          } else {
            // En modo guiado, resetear para el siguiente slot
            finalTranscript = '';
            setTranscript('');
          }
        }, silenceTimeout);
      }
    };

    recognition.onerror = (event: any) => {
      // 'aborted' ocurre al cerrar el micrófono o cambiar de modo, no es un error
      if (event.error === 'aborted') return;

      console.error('[useVoice] Error en Web Speech API:', event.error, event);
      clearSilenceTimer();

      // 'no-speech' a veces salta en silencio, no marcarlo como error fatal si hay transcripción parcial
      if (event.error === 'no-speech' && finalTranscript) {
        onResult?.(finalTranscript.trim());
        return;
      }
      const msg = getSpeechErrorMessage(event.error);
      setErrorMessage(msg);
      setState('error');
      onError?.(msg);
    };

    recognition.onend = () => {
      clearSilenceTimer();

      // Si autoRestart está activo y no hubo error, reiniciar
      if (autoRestartRef.current && state !== 'error') {
        try {
          recognition.start();
          return;
        } catch {
          // No se pudo reiniciar, proceder con el cierre normal
        }
      }

      // Liberar micrófono solo si no vamos a reiniciar
      if (!autoRestartRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setState((prev) => {
        if (prev === 'listening' && finalTranscript) {
          onResult?.(finalTranscript.trim());
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
    }
  }, [isSupported, onResult, onInterim, onError, clearSilenceTimer, silenceTimeout, lang]);

  /**
   * Reinicia la escucha sin pedir permisos de nuevo (reusar stream del micrófono).
   * Útil para el modo guiado entre slots.
   */
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

    // Re-iniciar con el stream existente
    startListening();
  }, [clearSilenceTimer, startListening]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    autoRestartRef.current = false; // Detener auto-restart al detener manualmente

    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignorar
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setState('idle');
  }, [clearSilenceTimer]);

  const reset = useCallback(() => {
    clearSilenceTimer();
    autoRestartRef.current = false;

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignorar
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setState('idle');
    setTranscript('');
    setErrorMessage('');
  }, [clearSilenceTimer]);

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
