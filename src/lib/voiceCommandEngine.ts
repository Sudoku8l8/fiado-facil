// ============================================================
// Flash Fiado — Voice Command Engine
// Motor de slots para dictado por voz (modo guiado + modo libre)
// ============================================================

import type { ParsedVoiceEntry } from '../types';
import { normalize, wordsToNumber, capitalizeWords, cleanTranscript } from './voiceParser';

// ----------------------------------------------------------------
// Definición de Slots
// ----------------------------------------------------------------

export interface VoiceSlot {
  key: keyof Omit<ParsedVoiceEntry, 'raw'>;
  label: string;
  prompt: string;
  required: boolean;
  type: 'text' | 'number';
  icon: string;
  validate: (value: string) => boolean;
  transform: (raw: string) => string | number | undefined;
}

/** Slots en orden de dictado */
export const VOICE_SLOTS: VoiceSlot[] = [
  {
    key: 'cliente',
    label: 'Cliente',
    prompt: '¿A quién le fías?',
    required: true,
    type: 'text',
    icon: '👤',
    validate: (v) => v.trim().length >= 2,
    transform: (raw) => {
      const cleaned = raw
        .replace(/^\b(a|para|cliente|al)\b\s*/i, '')
        .trim();
      return cleaned.length >= 2 ? capitalizeWords(cleaned) : undefined;
    },
  },
  {
    key: 'producto',
    label: 'Producto',
    prompt: '¿Qué producto?',
    required: false,
    type: 'text',
    icon: '📦',
    validate: (v) => v.trim().length >= 1,
    transform: (raw) => {
      const cleaned = raw
        .replace(/^\b(producto|un|una|unos|unas)\b\s*/i, '')
        .trim();
      return cleaned.length >= 1 ? capitalizeWords(cleaned) : undefined;
    },
  },
  {
    key: 'unidades',
    label: 'Unidades',
    prompt: '¿Cuántas unidades?',
    required: false,
    type: 'number',
    icon: '🔢',
    validate: (v) => {
      const n = wordsToNumber(v);
      return n !== null && n > 0 && Number.isInteger(n);
    },
    transform: (raw) => {
      const cleaned = raw
        .replace(/\b(unidades?|piezas?|kilos?|litros?|bolsas?|cajas?|paquetes?)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const n = wordsToNumber(cleaned);
      return n !== null && n > 0 ? Math.round(n) : undefined;
    },
  },
  {
    key: 'monto',
    label: 'Monto (S/)',
    prompt: '¿Cuánto cuesta?',
    required: true,
    type: 'number',
    icon: '💰',
    validate: (v) => {
      const cleaned = v.replace(/\b(soles?|sol)\b/gi, ' ').replace(/\s+/g, ' ').trim();
      const n = wordsToNumber(cleaned);
      return n !== null && n > 0;
    },
    transform: (raw) => {
      const cleaned = raw
        .replace(/\b(soles?|sol|precio|monto|cuesta|vale|son|por)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const n = wordsToNumber(cleaned);
      return n !== null && n > 0 ? n : undefined;
    },
  },
];

// ----------------------------------------------------------------
// Estado del flujo guiado
// ----------------------------------------------------------------

export interface SlotMachineState {
  currentStep: number;
  totalSteps: number;
  slots: Record<string, string | number | undefined>;
  isComplete: boolean;
}

export function createInitialSlotState(): SlotMachineState {
  return {
    currentStep: 0,
    totalSteps: VOICE_SLOTS.length,
    slots: {},
    isComplete: false,
  };
}

export function getCurrentSlot(state: SlotMachineState): VoiceSlot | null {
  if (state.currentStep >= VOICE_SLOTS.length) return null;
  return VOICE_SLOTS[state.currentStep];
}

export function getSlotByKey(key: string): VoiceSlot | undefined {
  return VOICE_SLOTS.find(s => s.key === key);
}

/**
 * Procesa el texto dictado para el slot actual.
 * Retorna el nuevo estado con el valor transformado.
 */
export function processSlotInput(
  state: SlotMachineState,
  rawText: string
): SlotMachineState {
  const slot = getCurrentSlot(state);
  if (!slot) return state;

  const text = rawText.trim();
  const transformed = slot.transform(text);

  const newSlots = { ...state.slots };

  // Si la transformación produce un valor válido, asignarlo
  if (transformed !== undefined) {
    newSlots[slot.key] = transformed;
  } else {
    // Usar el texto limpio directamente
    newSlots[slot.key] = slot.type === 'number'
      ? wordsToNumber(text) ?? undefined
      : capitalizeWords(text);
  }

  return {
    ...state,
    slots: newSlots,
  };
}

/**
 * Avanza al siguiente slot.
 * Si el slot actual es opcional y está vacío, se salta.
 */
export function advanceSlot(state: SlotMachineState): SlotMachineState {
  const nextStep = state.currentStep + 1;
  const isComplete = nextStep >= VOICE_SLOTS.length;

  return {
    ...state,
    currentStep: nextStep,
    isComplete,
  };
}

/**
 * Retrocede al slot anterior.
 */
export function goBackSlot(state: SlotMachineState): SlotMachineState {
  if (state.currentStep <= 0) return state;
  return {
    ...state,
    currentStep: state.currentStep - 1,
    isComplete: false,
  };
}

/**
 * Salta a un slot específico por índice.
 */
export function jumpToSlot(state: SlotMachineState, stepIndex: number): SlotMachineState {
  if (stepIndex < 0 || stepIndex >= VOICE_SLOTS.length) return state;
  return {
    ...state,
    currentStep: stepIndex,
    isComplete: false,
  };
}

/**
 * Convierte el estado de slots a un ParsedVoiceEntry.
 */
export function slotsToEntry(state: SlotMachineState, rawTranscript: string): ParsedVoiceEntry {
  return {
    raw: rawTranscript,
    cliente: state.slots.cliente as string | undefined,
    producto: state.slots.producto as string | undefined,
    unidades: state.slots.unidades as number | undefined,
    monto: state.slots.monto as number | undefined,
  };
}

/**
 * Verifica si los campos requeridos están completos.
 */
export function getMissingRequiredSlots(state: SlotMachineState): VoiceSlot[] {
  return VOICE_SLOTS.filter(slot => {
    if (!slot.required) return false;
    const value = state.slots[slot.key];
    return value === undefined || value === null || value === '';
  });
}

// ----------------------------------------------------------------
// Detección de comandos de navegación por voz
// ----------------------------------------------------------------

export type VoiceNavCommand = 'back' | 'cancel' | 'skip' | 'confirm' | 'none';

const NAV_COMMANDS: Record<string, VoiceNavCommand> = {
  'atras': 'back',
  'volver': 'back',
  'regresar': 'back',
  'anterior': 'back',
  'corregir': 'back',
  'cancelar': 'cancel',
  'salir': 'cancel',
  'cerrar': 'cancel',
  'pasar': 'skip',
  'saltar': 'skip',
  'siguiente': 'skip',
  'omitir': 'skip',
  'confirmar': 'confirm',
  'listo': 'confirm',
  'guardar': 'confirm',
  'ok': 'confirm',
  'okey': 'confirm',
};

/**
 * Detecta si el texto dictado es un comando de navegación.
 */
export function detectNavCommand(text: string): VoiceNavCommand {
  const normalized = normalize(text);
  return NAV_COMMANDS[normalized] || 'none';
}

// ----------------------------------------------------------------
// Parser de modo libre mejorado (con keywords como delimitadores)
// ----------------------------------------------------------------

/**
 * Keywords que actúan como delimitadores en el modo libre.
 * El usuario dice: "cliente Pablo producto gaseosa unidades dos precio siete"
 */
const KEYWORD_MAP: Record<string, keyof Omit<ParsedVoiceEntry, 'raw'>> = {
  'cliente': 'cliente',
  'nombre': 'cliente',
  'para': 'cliente',
  'producto': 'producto',
  'articulo': 'producto',
  'unidades': 'unidades',
  'unidad': 'unidades',
  'cantidad': 'unidades',
  'precio': 'monto',
  'monto': 'monto',
  'cuesta': 'monto',
  'vale': 'monto',
  'total': 'monto',
};

/**
 * Parser de modo libre con keywords como delimitadores.
 * Más confiable que el parser legacy porque usa tokens explícitos.
 */
export function parseWithKeywords(rawText: string): ParsedVoiceEntry {
  const result: ParsedVoiceEntry = { raw: rawText };
  const text = cleanTranscript(rawText);
  const normalized = normalize(text);
  const words = normalized.split(/\s+/);

  let currentField: keyof Omit<ParsedVoiceEntry, 'raw'> | null = null;
  let currentValue: string[] = [];

  const flushField = () => {
    if (currentField && currentValue.length > 0) {
      const rawValue = currentValue.join(' ');
      const slot = getSlotByKey(currentField);
      if (slot) {
        const transformed = slot.transform(rawValue);
        if (transformed !== undefined) {
          (result as any)[currentField] = transformed;
        }
      }
    }
    currentValue = [];
  };

  for (const word of words) {
    const mappedField = KEYWORD_MAP[word];
    if (mappedField) {
      // Flush previous field value
      flushField();
      currentField = mappedField;
    } else if (currentField) {
      currentValue.push(word);
    }
  }

  // Flush last field
  flushField();

  return result;
}

/**
 * Detecta si el texto contiene keywords delimitadoras.
 * Útil para decidir entre parser libre y guiado.
 */
export function hasKeywords(text: string): boolean {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/);
  let keywordCount = 0;

  for (const word of words) {
    if (KEYWORD_MAP[word]) keywordCount++;
  }

  // Al menos 2 keywords para considerar modo libre con keywords
  return keywordCount >= 2;
}
