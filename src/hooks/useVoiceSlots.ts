// ============================================================
// Flash Fiado — useVoiceSlots Hook
// Máquina de estados para el flujo de dictado guiado
// ============================================================
import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoice } from './useVoice';
import { useTTS } from './useTTS';
import type { ParsedVoiceEntry } from '../types';
import {
  VOICE_SLOTS,
  type VoiceSlot,
  type SlotMachineState,
  createInitialSlotState,
  getCurrentSlot,
  processSlotInput,
  advanceSlot,
  goBackSlot,
  jumpToSlot,
  slotsToEntry,
  getMissingRequiredSlots,
  detectNavCommand,
  parseWithKeywords,
  hasKeywords,
} from '../lib/voiceCommandEngine';
import { parseVoiceEntry } from '../lib/voiceParser';

export type VoiceDictationMode = 'idle' | 'guided' | 'free' | 'confirming';

interface UseVoiceSlotsReturn {
  // Estado
  mode: VoiceDictationMode;
  slotState: SlotMachineState;
  currentSlot: VoiceSlot | null;
  currentStep: number;
  totalSteps: number;
  filledSlots: Record<string, string | number | undefined>;
  transcript: string;
  interimText: string;
  isListening: boolean;
  isSupported: boolean;
  errorMessage: string;

  // TTS
  isTTSEnabled: boolean;
  toggleTTS: () => void;

  // Acciones
  startGuided: () => void;
  startFree: () => void;
  confirmSlot: () => void;
  skipSlot: () => void;
  goBack: () => void;
  editSlot: (stepIndex: number) => void;
  cancel: () => void;
  stopListening: () => void;

  // Resultado
  result: ParsedVoiceEntry | null;
  missingSlots: VoiceSlot[];
}

export function useVoiceSlots(): UseVoiceSlotsReturn {
  const [mode, setMode] = useState<VoiceDictationMode>('idle');
  const [slotState, setSlotState] = useState<SlotMachineState>(createInitialSlotState());
  const [result, setResult] = useState<ParsedVoiceEntry | null>(null);
  const [interimText, setInterimText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const modeRef = useRef<VoiceDictationMode>('idle');
  const slotStateRef = useRef<SlotMachineState>(slotState);
  const fullTranscriptRef = useRef('');

  // Mantener refs actualizadas
  modeRef.current = mode;
  slotStateRef.current = slotState;

  const tts = useTTS();

  const handleVoiceResult = useCallback((text: string) => {
    if (modeRef.current === 'guided') {
      // Detectar comandos de navegación
      const navCmd = detectNavCommand(text);

      if (navCmd === 'back') {
        setSlotState(prev => goBackSlot(prev));
        return;
      }
      if (navCmd === 'cancel') {
        setMode('idle');
        setSlotState(createInitialSlotState());
        return;
      }
      if (navCmd === 'skip') {
        const currentSlot = getCurrentSlot(slotStateRef.current);
        if (currentSlot && !currentSlot.required) {
          setSlotState(prev => advanceSlot(prev));
        }
        return;
      }
      if (navCmd === 'confirm') {
        const missing = getMissingRequiredSlots(slotStateRef.current);
        if (missing.length === 0) {
          const entry = slotsToEntry(slotStateRef.current, fullTranscriptRef.current);
          setResult(entry);
          setMode('confirming');
        }
        return;
      }

      // Procesar como valor del slot actual
      const newState = processSlotInput(slotStateRef.current, text);
      fullTranscriptRef.current += ` ${text}`;

      // Verificar si el valor fue capturado correctamente
      const currentSlot = getCurrentSlot(slotStateRef.current);
      if (currentSlot) {
        const value = newState.slots[currentSlot.key];
        if (value !== undefined && value !== '') {
          // Valor capturado, avanzar automáticamente
          const advanced = advanceSlot(newState);
          setSlotState(advanced);

          // Feedback háptico
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }

          // Si completó todos los slots
          if (advanced.isComplete) {
            const entry = slotsToEntry(advanced, fullTranscriptRef.current.trim());
            setResult(entry);
            setMode('confirming');
          }
        } else {
          setSlotState(newState);
        }
      }
    } else if (modeRef.current === 'free') {
      fullTranscriptRef.current = text;

      // Decidir qué parser usar
      let parsed: ParsedVoiceEntry;
      if (hasKeywords(text)) {
        parsed = parseWithKeywords(text);
      } else {
        parsed = parseVoiceEntry(text);
      }

      setResult(parsed);
      setMode('confirming');
    }
  }, []);

  const handleInterim = useCallback((text: string) => {
    setInterimText(text);
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    setErrorMsg(error);
  }, []);

  const voice = useVoice({
    onResult: handleVoiceResult,
    onInterim: handleInterim,
    onError: handleVoiceError,
    autoRestart: mode === 'guided',
    silenceTimeout: mode === 'guided' ? 1500 : 2000,
  });

  // Cuando cambia el slot actual en modo guiado, hablar el prompt via TTS
  const currentSlot = getCurrentSlot(slotState);
  const currentStep = slotState.currentStep;

  useEffect(() => {
    if (mode === 'guided' && currentSlot && !slotState.isComplete) {
      // Hablar el prompt del slot actual
      tts.speak(currentSlot.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentStep]);

  const startGuided = useCallback(() => {
    setMode('guided');
    setSlotState(createInitialSlotState());
    setResult(null);
    setInterimText('');
    setErrorMsg('');
    fullTranscriptRef.current = '';
    voice.startListening();
  }, [voice]);

  const startFree = useCallback(() => {
    setMode('free');
    setSlotState(createInitialSlotState());
    setResult(null);
    setInterimText('');
    setErrorMsg('');
    fullTranscriptRef.current = '';
    voice.startListening();
  }, [voice]);

  const confirmSlot = useCallback(() => {
    if (mode !== 'guided') return;

    const current = getCurrentSlot(slotStateRef.current);
    if (!current) return;

    // Si el slot tiene valor, avanzar
    const value = slotStateRef.current.slots[current.key];
    if (value !== undefined && value !== '') {
      const advanced = advanceSlot(slotStateRef.current);
      setSlotState(advanced);

      if (advanced.isComplete) {
        const entry = slotsToEntry(advanced, fullTranscriptRef.current.trim());
        setResult(entry);
        setMode('confirming');
        voice.stopListening();
      } else {
        voice.restartListening();
      }
    }
  }, [mode, voice]);

  const skipSlot = useCallback(() => {
    if (mode !== 'guided') return;
    const current = getCurrentSlot(slotStateRef.current);
    if (!current || current.required) return;

    const advanced = advanceSlot(slotStateRef.current);
    setSlotState(advanced);

    if (advanced.isComplete) {
      const entry = slotsToEntry(advanced, fullTranscriptRef.current.trim());
      setResult(entry);
      setMode('confirming');
      voice.stopListening();
    } else {
      voice.restartListening();
    }
  }, [mode, voice]);

  const goBack = useCallback(() => {
    if (mode !== 'guided' || slotState.currentStep <= 0) return;
    setSlotState(prev => goBackSlot(prev));
    voice.restartListening();
  }, [mode, slotState.currentStep, voice]);

  const editSlot = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= VOICE_SLOTS.length) return;
    setSlotState(prev => jumpToSlot(prev, stepIndex));
    setMode('guided');
    voice.restartListening();
  }, [voice]);

  const cancel = useCallback(() => {
    voice.reset();
    setMode('idle');
    setSlotState(createInitialSlotState());
    setResult(null);
    setInterimText('');
    setErrorMsg('');
    fullTranscriptRef.current = '';
    tts.stop();
  }, [voice, tts]);

  const missingSlots = getMissingRequiredSlots(slotState);

  return {
    mode,
    slotState,
    currentSlot,
    currentStep: slotState.currentStep,
    totalSteps: slotState.totalSteps,
    filledSlots: slotState.slots,
    transcript: voice.transcript,
    interimText,
    isListening: voice.isListening,
    isSupported: voice.isSupported,
    errorMessage: errorMsg || voice.errorMessage,

    isTTSEnabled: tts.isEnabled,
    toggleTTS: tts.toggleEnabled,

    startGuided,
    startFree,
    confirmSlot,
    skipSlot,
    goBack,
    editSlot,
    cancel,
    stopListening: voice.stopListening,

    result,
    missingSlots,
  };
}
