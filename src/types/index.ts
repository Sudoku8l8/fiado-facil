// ============================================================
// Flash Fiado — Tipos e Interfaces Globales
// ============================================================

export type UserRole = 'dueño' | 'empleado';
export type MovementType = 'deuda' | 'abono';

export interface FirebaseUser {
  uid: string;
  email: string | null;
}

export interface AppUser {
  uid: string;
  nombre: string;
  rol: UserRole;
  storeName: string;
}

export interface Client {
  id: string;
  nombre: string;
  deudaTotal: number;
  fechaUltimoMovimiento: Date | null;
  storeName: string;
}

export interface MovementItem {
  producto: string;
  unidades: number;
  precioUnitario?: number;
}

export interface Movement {
  id: string;
  clientId: string;
  tipo: MovementType;
  items?: MovementItem[];
  producto?: string; // resumen textual (ej: "1 Gaseosa, 2 Leches")
  unidades?: number;
  monto: number;
  fecha: Date;
  registradoPor: string; // nombre del usuario
  registradoPorUid: string;
}

// Para el parser de voz
export interface ParsedVoiceEntry {
  cliente?: string;
  items?: MovementItem[];
  producto?: string;
  unidades?: number;
  monto?: number;
  raw: string; // texto original transcrito
}

// Estado del reconocimiento de voz
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
