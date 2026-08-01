// ============================================================
// Flash Fiado — Multi-Item Parser Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { parseVoiceEntry, parseItemsList } from '../voiceParser';

describe('Multi-Item Parser (voiceParser.ts)', () => {
  it('parses multiple items from list segment text', () => {
    const text = '1 gaseosa 2 leches';
    const items = parseItemsList(text);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ unidades: 1, producto: 'Gaseosa' });
    expect(items[1]).toEqual({ unidades: 2, producto: 'Leches' });
  });

  it('parses items with "y", "con" or commas as connectors', () => {
    const text = '3 aceites y 2 kilos de arroz, 1 leche';
    const items = parseItemsList(text);

    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ unidades: 3, producto: 'Aceites' });
    expect(items[1]).toEqual({ unidades: 2, producto: 'Kilos De Arroz' });
    expect(items[2]).toEqual({ unidades: 1, producto: 'Leche' });
  });

  it('parses full natural dictation sentence with multiple items and 1 total amount', () => {
    const input = 'Pablo 1 gaseosa y 2 leches 16 soles';
    const parsed = parseVoiceEntry(input);

    expect(parsed.cliente).toBe('Pablo');
    expect(parsed.monto).toBe(16);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items![0]).toEqual({ unidades: 1, producto: 'Gaseosa' });
    expect(parsed.items![1]).toEqual({ unidades: 2, producto: 'Leches' });
    expect(parsed.producto).toBe('Gaseosa, 2 Leches');
    expect(parsed.unidades).toBe(3);
  });

  it('parses dictation with single item naturally', () => {
    const input = 'A Juan 2 aceites por 18 soles';
    const parsed = parseVoiceEntry(input);

    expect(parsed.cliente).toBe('Juan');
    expect(parsed.monto).toBe(18);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items![0]).toEqual({ unidades: 2, producto: 'Aceites' });
    expect(parsed.producto).toBe('Aceites');
    expect(parsed.unidades).toBe(2);
  });

  it('prevents number words from being included in client name', () => {
    const input = 'registrar a juan tres aceites dos kilos de arroz por veintiocho soles';
    const parsed = parseVoiceEntry(input);

    expect(parsed.cliente).toBe('Juan');
    expect(parsed.monto).toBe(28);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items![0]).toEqual({ unidades: 3, producto: 'Aceites' });
    expect(parsed.items![1]).toEqual({ unidades: 2, producto: 'Kilos De Arroz' });
  });
});
