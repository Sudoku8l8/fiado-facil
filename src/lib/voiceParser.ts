// ============================================================
// Flash Fiado — Voice Parser Utilities (es-PE)
// Normalización, conversión numérica y parser NLP directo
// ============================================================

import type { ParsedVoiceEntry } from '../types';
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

// ----------------------------------------------------------------
// Parser de dictado libre directo (NLP de 1 sola frase)
// ----------------------------------------------------------------

/**
 * Parsea una frase dictada completa en un solo paso.
 * Ejemplo 1: "Pablo 2 gaseosas 10 soles"
 * Ejemplo 2: "A Juan un aceite 8.50"
 * Ejemplo 3: "cliente Carlos producto arroz unidades 3 precio 15"
 */
export function parseVoiceEntry(rawText: string): ParsedVoiceEntry {
  const result: ParsedVoiceEntry = { raw: rawText };
  if (!rawText || !rawText.trim()) return result;

  // Si usa palabras clave explícitas (cliente, producto, cantidad, precio), usar parser delimitador
  if (hasKeywords(rawText)) {
    const kwParsed = parseWithKeywords(rawText);
    if (kwParsed.cliente || kwParsed.monto) {
      return kwParsed;
    }
  }

  let text = cleanTranscript(rawText);

  // 1. Extraer CLIENTE
  const clientMatch = text.match(/(?:a|para|cliente|al)\s+([A-Za-záéíóúÁÉÍÓÚñÑüÜ]{2,}(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑüÜ]{2,})?)/i);
  if (clientMatch) {
    result.cliente = capitalizeWords(clientMatch[1].trim());
    text = text.replace(clientMatch[0], ' ').trim();
  } else {
    // Si empieza directamente con el nombre (ej: "Pablo 2 gaseosas...")
    const leadingNameMatch = text.match(/^([A-Za-záéíóúÁÉÍÓÚñÑüÜ]{2,}(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑüÜ]{2,})?)\s+(?=\d|\b(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|monto|precio|por|cuesta|soles?)\b)/i);
    if (leadingNameMatch) {
      result.cliente = capitalizeWords(leadingNameMatch[1].trim());
      text = text.replace(leadingNameMatch[0], ' ').trim();
    }
  }

  // 2. Extraer MONTO (monto X, precio X, X soles, por X)
  const amountMatch =
    text.match(/(?:monto|precio|cuesta|vale|son|por|a)\s+([\d,.]+|\b(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cincuenta|cien)\b)(?:\s+(?:soles?|sol))?/i) ||
    text.match(/\b([\d,.]+|\b(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cincuenta|cien)\b)\s*(?:soles?|sol)\b/i);

  if (amountMatch) {
    const rawAmount = amountMatch[1].replace(/soles?|sol/gi, '').trim();
    const amount = wordsToNumber(rawAmount);
    if (amount !== null) {
      result.monto = amount;
      text = text.replace(amountMatch[0], ' ').trim();
    }
  }

  // 3. Extraer UNIDADES y PRODUCTO ([N] [Producto])
  const itemMatch = text.match(/(\d+|\b(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b)?\s*([a-záéíóúñüÁÉÍÓÚÑÜ\s]{2,})/i);
  if (itemMatch) {
    if (itemMatch[1]) {
      const units = wordsToNumber(itemMatch[1].trim());
      if (units !== null && units > 0) {
        result.unidades = Math.round(units);
      }
    }
    if (itemMatch[2]) {
      const rawProd = itemMatch[2].replace(/\b(soles?|sol|monto|precio|por|a)\b/gi, '').trim();
      if (rawProd.length >= 2) {
        result.producto = capitalizeWords(rawProd);
      }
    }
  }

  // Si no especificó unidades pero hay producto, por defecto 1
  if (result.producto && !result.unidades) {
    result.unidades = 1;
  }

  return result;
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
