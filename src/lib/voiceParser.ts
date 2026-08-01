// ============================================================
// Flash Fiado — Voice Parser Utilities (es-PE)
// Normalización, conversión numérica y parser NLP multi-producto
// ============================================================

import type { ParsedVoiceEntry, MovementItem } from '../types';
import { hasKeywords, parseWithKeywords } from './voiceCommandEngine';

// ----------------------------------------------------------------
// Normalización de texto
// ----------------------------------------------------------------
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .trim();
}

// ----------------------------------------------------------------
// Conversión de números en palabras a dígitos (es-PE)
// ----------------------------------------------------------------
const WORDS_TO_NUMBERS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4,
  cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40,
  cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600,
  setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000,
  medio: 0.5, media: 0.5,
};

const NUMBER_WORDS_SET = new Set([
  'cero', 'un', 'uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete',
  'veintiocho', 'veintinueve', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa',
  'cien', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos',
  'ochocientos', 'novecientos', 'mil', 'monto', 'precio', 'cuesta', 'vale', 'son', 'por', 'soles', 'sol',
]);

const NUMBER_WORDS_PATTERN = '(?:[\\d,.]+|\\b(?:un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veintiuno|veintidos|veintitres|veinticuatro|veinticinco|veintiseis|veintisiete|veintiocho|veintinueve|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|mil)\\b)';

/**
 * Convierte texto numérico (dígitos o palabras) a un número.
 */
export function wordsToNumber(text: string): number | null {
  const n = normalize(text);

  const directNum = parseFloat(n.replace(',', '.'));
  if (!isNaN(directNum)) return directNum;

  if (WORDS_TO_NUMBERS[n] !== undefined) return WORDS_TO_NUMBERS[n];

  const conMatch = n.match(/^(.+?)\s+con\s+(.+)$/);
  if (conMatch) {
    const integer = wordsToNumber(conMatch[1]);
    const decimal = wordsToNumber(conMatch[2]);
    if (integer !== null && decimal !== null) {
      return parseFloat(`${integer}.${String(decimal).padStart(2, '0')}`);
    }
  }

  const yMatch = n.match(/^(.+?)\s+y\s+(.+)$/);
  if (yMatch) {
    const tens = wordsToNumber(yMatch[1]);
    const units = wordsToNumber(yMatch[2]);
    if (tens !== null && units !== null && tens >= 20 && units < 10) {
      return tens + units;
    }
  }

  const milMatch = n.match(/^(.+?)\s*mil(?:\s+(.+))?$/);
  if (milMatch) {
    const thousands = wordsToNumber(milMatch[1]);
    const remainder = milMatch[2] ? wordsToNumber(milMatch[2]) : 0;
    if (thousands !== null && remainder !== null) {
      return thousands * 1000 + remainder;
    }
  }

  if (n === 'mil') return 1000;

  return null;
}

export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function cleanTranscript(text: string): string {
  return text
    .replace(/^(anotar?|registrar?|apuntar?|agregar?|fiado?)\s*/i, '')
    .trim();
}

export function extractNumber(text: string): number | null {
  const cleaned = text.replace(/\b(soles?|sol)\b/gi, '').trim();
  return wordsToNumber(cleaned);
}

/**
 * Extrae el nombre del cliente evitando capturar palabras numéricas (ej. "Juan 3" -> "Juan")
 */
export function extractClientName(text: string): { clientName: string | null; matchedRaw: string | null } {
  const match = text.match(/(?:(?:a|para|cliente|al)\s+)?([A-Za-záéíóúÁÉÍÓÚñÑüÜ]{2,}(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑüÜ]{2,})?)/i);

  if (!match) return { clientName: null, matchedRaw: null };

  const rawWords = match[1].trim().split(/\s+/);
  const validWords: string[] = [];

  for (const word of rawWords) {
    const norm = normalize(word);
    if (NUMBER_WORDS_SET.has(norm) || !isNaN(parseFloat(norm))) {
      break;
    }
    validWords.push(word);
  }

  if (validWords.length === 0) return { clientName: null, matchedRaw: null };

  const clientName = capitalizeWords(validWords.join(' '));
  const prefixMatch =
    text.match(new RegExp(`(?:a|para|cliente|al)\\s+${validWords.join('\\s+')}`, 'i')) ||
    text.match(new RegExp(validWords.join('\\s+'), 'i'));

  return {
    clientName,
    matchedRaw: prefixMatch ? prefixMatch[0] : validWords.join(' '),
  };
}

// ----------------------------------------------------------------
// Parser de dictado libre multi-producto (NLP es-PE)
// ----------------------------------------------------------------

/**
 * Parsea una frase dictada con 1 o varios productos en un solo paso.
 * Ejemplo 1: "Registrar a Juan 3 aceites 2 kilos de arroz por 28 soles"
 * Ejemplo 2: "Pablo 1 gaseosa 2 leches 16 soles"
 */
export function parseVoiceEntry(rawText: string): ParsedVoiceEntry {
  const result: ParsedVoiceEntry = { raw: rawText, items: [] };
  if (!rawText || !rawText.trim()) return result;

  if (hasKeywords(rawText)) {
    const kwParsed = parseWithKeywords(rawText);
    if (kwParsed.cliente || kwParsed.monto) {
      if (kwParsed.producto) {
        kwParsed.items = [{ producto: kwParsed.producto, unidades: kwParsed.unidades || 1 }];
      }
      return kwParsed;
    }
  }

  let text = cleanTranscript(rawText);

  // 1. Extraer CLIENTE (evitando palabras numéricas)
  const clientExtracted = extractClientName(text);
  if (clientExtracted.clientName && clientExtracted.matchedRaw) {
    result.cliente = clientExtracted.clientName;
    text = text.replace(clientExtracted.matchedRaw, ' ').trim();
  }

  // 2. Extraer MONTO TOTAL
  const amountMatch =
    text.match(new RegExp(`(?:monto|precio|cuesta|vale|son|por|a)\\s+(${NUMBER_WORDS_PATTERN})(?:\\s+(?:soles?|sol))?`, 'i')) ||
    text.match(new RegExp(`\\b(${NUMBER_WORDS_PATTERN})\\s*(?:soles?|sol)\\b`, 'i'));

  if (amountMatch) {
    const rawAmount = amountMatch[1].replace(/soles?|sol/gi, '').trim();
    const amount = wordsToNumber(rawAmount);
    if (amount !== null) {
      result.monto = amount;
      text = text.replace(amountMatch[0], ' ').trim();
    }
  }

  // 3. Extraer MÚLTIPLES ÍTEMS del texto restante
  const cleanedItemsText = text.replace(/\b(soles?|sol|monto|precio|por)\b/gi, ' ').trim();
  const items: MovementItem[] = parseItemsList(cleanedItemsText);

  if (items.length > 0) {
    result.items = items;
    result.producto = items.length === 1 ? items[0].producto : items.map(i => `${i.unidades > 1 ? i.unidades + ' ' : ''}${i.producto}`).join(', ');
    result.unidades = items.reduce((sum, i) => sum + i.unidades, 0);
  }

  return result;
}

/**
 * Parsea una lista de productos a partir de texto (ej. "3 aceites 2 kilos de arroz" o "1 gaseosa 2 leches")
 */
export function parseItemsList(text: string): MovementItem[] {
  if (!text || !text.trim()) return [];

  const clean = text
    .replace(/\s*(?:,|;|\by\b|\bcon\b|\bmás\b)\s*/gi, ' ')
    .trim();

  // Capturar [Unidades (opcional)] [Nombre del producto (sin tragar números del siguiente producto)]
  const itemRegex = new RegExp(
    `(?:(${NUMBER_WORDS_PATTERN})\\s+)?` +
    `([a-záéíóúñüÁÉÍÓÚÑÜ]+(?:\\s+(?!${NUMBER_WORDS_PATTERN}\\b)[a-záéíóúñüÁÉÍÓÚÑÜ]+)*)`,
    'gi'
  );

  const items: MovementItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(clean)) !== null) {
    const rawUnits = match[1] ? match[1].trim() : '1';
    const units = wordsToNumber(rawUnits) || 1;
    const rawProd = match[2].trim();

    if (
      rawProd.length >= 2 &&
      !NUMBER_WORDS_SET.has(normalize(rawProd))
    ) {
      items.push({
        unidades: Math.round(units),
        producto: capitalizeWords(rawProd),
      });
    }
  }

  return items;
}

export function getParseErrors(entry: ParsedVoiceEntry): string[] {
  const errors: string[] = [];
  if (!entry.cliente) errors.push('cliente');
  if (entry.monto === undefined || entry.monto === null) errors.push('monto');
  return errors;
}

export function isValidEntry(entry: ParsedVoiceEntry): boolean {
  return getParseErrors(entry).length === 0;
}
