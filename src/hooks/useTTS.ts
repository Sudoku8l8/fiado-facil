// ============================================================
// Flash Fiado — useTTS Hook
// Text-to-Speech para prompts del modo guiado
// ============================================================
import { useState, useRef, useCallback } from 'react';

interface UseTTSOptions {
  /** Idioma de la síntesis. Default: 'es-PE' */
  lang?: string;
  /** Rate de velocidad. Default: 1.0 */
  rate?: number;
  /** Pitch. Default: 1.0 */
  pitch?: number;
}

export function useTTS({ lang = 'es-419', rate = 1.05, pitch = 1.0 }: UseTTSOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false); // Deshabilitado por defecto
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !isEnabled) return;

      // Cancelar utterance anterior
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Intentar usar una voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) => v.lang.startsWith('es') && v.localService
      ) || voices.find((v) => v.lang.startsWith('es'));

      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, isEnabled, lang, rate, pitch]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      if (prev) {
        // Al desactivar, detener cualquier utterance en curso
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    isEnabled,
    toggleEnabled,
  };
}
