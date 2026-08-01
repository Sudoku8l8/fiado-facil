// ============================================================
// Flash Fiado — Voice Command Engine Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  VOICE_SLOTS,
  createInitialSlotState,
  processSlotInput,
  advanceSlot,
  goBackSlot,
  parseWithKeywords,
  hasKeywords,
  detectNavCommand,
} from '../voiceCommandEngine';
import { wordsToNumber, parseVoiceEntry } from '../voiceParser';

describe('Voice Command Engine - Utility Functions', () => {
  it('converts spoken number words to numbers in es-PE', () => {
    expect(wordsToNumber('cinco')).toBe(5);
    expect(wordsToNumber('diez')).toBe(10);
    expect(wordsToNumber('quince')).toBe(15);
    expect(wordsToNumber('tres con cincuenta')).toBe(3.5);
    expect(wordsToNumber('siete con cincuenta')).toBe(7.5);
    expect(wordsToNumber('veinte y cinco')).toBe(25);
    expect(wordsToNumber('12.50')).toBe(12.5);
  });

  it('detects voice navigation commands', () => {
    expect(detectNavCommand('atras')).toBe('back');
    expect(detectNavCommand('volver')).toBe('back');
    expect(detectNavCommand('cancelar')).toBe('cancel');
    expect(detectNavCommand('saltar')).toBe('skip');
    expect(detectNavCommand('confirmar')).toBe('confirm');
    expect(detectNavCommand('hola')).toBe('none');
  });

  it('detects presence of delimiting keywords', () => {
    expect(hasKeywords('cliente pablo producto gaseosa')).toBe(true);
    expect(hasKeywords('para pablo dos gaseosas')).toBe(false);
  });
});

describe('Voice Command Engine - Slot Machine', () => {
  it('processes slot input step by step', () => {
    let state = createInitialSlotState();

    // Step 0: Cliente
    expect(VOICE_SLOTS[state.currentStep].key).toBe('cliente');
    state = processSlotInput(state, 'a pablo rodriguez');
    expect(state.slots.cliente).toBe('Pablo Rodriguez');

    state = advanceSlot(state);

    // Step 1: Producto
    expect(VOICE_SLOTS[state.currentStep].key).toBe('producto');
    state = processSlotInput(state, 'gaseosa inka kola');
    expect(state.slots.producto).toBe('Gaseosa Inka Kola');

    state = advanceSlot(state);

    // Step 2: Unidades
    expect(VOICE_SLOTS[state.currentStep].key).toBe('unidades');
    state = processSlotInput(state, 'dos unidades');
    expect(state.slots.unidades).toBe(2);

    state = advanceSlot(state);

    // Step 3: Monto
    expect(VOICE_SLOTS[state.currentStep].key).toBe('monto');
    state = processSlotInput(state, 'siete soles con cincuenta');
    expect(state.slots.monto).toBe(7.5);

    state = advanceSlot(state);
    expect(state.isComplete).toBe(true);
  });

  it('handles going back to previous slots', () => {
    let state = createInitialSlotState();
    state = processSlotInput(state, 'Pablo');
    state = advanceSlot(state);
    expect(state.currentStep).toBe(1);

    state = goBackSlot(state);
    expect(state.currentStep).toBe(0);
  });
});

describe('Voice Command Engine - Free Mode Keyword Parser', () => {
  it('parses structured free voice input using keywords', () => {
    const input = 'cliente pablo producto gaseosa unidades dos precio siete con cincuenta';
    const parsed = parseWithKeywords(input);

    expect(parsed.cliente).toBe('Pablo');
    expect(parsed.producto).toBe('Gaseosa');
    expect(parsed.unidades).toBe(2);
    expect(parsed.monto).toBe(7.5);
  });
});

describe('Voice Parser - Legacy Fallback', () => {
  it('parses natural speech dictation', () => {
    const input = 'Anotar a Pablo 2 gaseosas por 7 soles';
    const parsed = parseVoiceEntry(input);

    expect(parsed.cliente).toBe('Pablo');
    expect(parsed.unidades).toBe(2);
    expect(parsed.producto).toBe('Gaseosas');
    expect(parsed.monto).toBe(7);
  });
});
