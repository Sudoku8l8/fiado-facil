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

export interface Movement {
  id: string;
  clientId: string;
  tipo: MovementType;
  producto?: string;
  unidades?: number;
  monto: number;
  fecha: Date;
  registradoPor: string; // nombre del usuario
  registradoPorUid: string;
}

// Para el parser de voz
export interface ParsedVoiceEntry {
  cliente?: string;
  producto?: string;
  unidades?: number;
  monto?: number;
  raw: string; // texto original transcrito
}

// Estado de la reconocimiento de voz
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
