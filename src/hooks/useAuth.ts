// ============================================================
// Flash Fiado — useAuth Hook
// Autenticación con email/password
// Optimizado: nunca usar storeName fallback incorrecto
// ============================================================
import { useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { AppUser } from '../types';

// Constantes de timeout
const AUTH_INIT_TIMEOUT_MS = 3000;      // Máx espera para Firebase Auth init
const PROFILE_NET_TIMEOUT_MS = 4000;    // Red con timeout para cargar perfil
const PROFILE_RETRY_DELAY_MS = 2000;    // Retry si falló
const PROFILE_MAX_RETRIES = 3;          // Reintentos máximos

export function useAuth() {
  const {
    firebaseUser, appUser, loading, error,
    setFirebaseUser, setAppUser, setLoading, setError, reset,
  } = useAuthStore();

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Escuchar cambios de estado de autenticación
  useEffect(() => {
    let authResolved = false;

    // Timeout de seguridad: si Firebase Auth no responde, mostrar Login
    const authTimeout = setTimeout(() => {
      if (!authResolved) {
        authResolved = true;
        console.warn(`[useAuth] Firebase Auth no respondió en ${AUTH_INIT_TIMEOUT_MS}ms`);
        setLoading(false);
      }
    }, AUTH_INIT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      authResolved = true;
      clearTimeout(authTimeout);

      if (fbUser) {
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
        // Cargar perfil REAL desde Firestore (con reintentos)
        await loadAppUserWithRetries(fbUser.uid);
      } else {
        reset();
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(authTimeout);
      clearTimeout(retryTimerRef.current);
      unsubscribe();
    };
  }, []);

  /**
   * Cargar perfil con reintentos.
   * NUNCA asigna un storeName inventado. Si no puede cargar, retorna null
   * y el usuario verá la pantalla de Setup (que es correcto para un nuevo usuario real).
   */
  async function loadAppUserWithRetries(uid: string, attempt = 1): Promise<void> {
    const profile = await loadAppUser(uid);

    if (profile) {
      setAppUser(profile);
      return;
    }

    // Si no se pudo cargar y aún quedan reintentos, programar uno
    if (attempt < PROFILE_MAX_RETRIES) {
      console.warn(`[useAuth] Perfil no encontrado (intento ${attempt}/${PROFILE_MAX_RETRIES}), reintentando en ${PROFILE_RETRY_DELAY_MS}ms...`);
      return new Promise<void>((resolve) => {
        retryTimerRef.current = setTimeout(async () => {
          await loadAppUserWithRetries(uid, attempt + 1);
          resolve();
        }, PROFILE_RETRY_DELAY_MS);
      });
    }

    // Tras agotar reintentos: NO asignar un perfil falso.
    // appUser queda null → App muestra pantalla de Setup,
    // lo cual es correcto si el usuario realmente no tiene perfil.
    console.warn('[useAuth] No se pudo cargar perfil tras todos los reintentos. Mostrando Setup.');
  }

  /**
   * Cargar perfil de usuario desde Firestore.
   * Retorna el AppUser si existe, null si no.
   */
  async function loadAppUser(uid: string): Promise<AppUser | null> {
    const userRef = doc(db, 'usuarios', uid);

    // 1. Intentar caché local (instantáneo en dispositivos con sesión previa)
    try {
      const cacheSnap = await getDocFromCache(userRef);
      if (cacheSnap.exists()) {
        return cacheSnap.data() as AppUser;
      }
    } catch {
      // No hay caché (normal en nuevo dispositivo)
    }

    // 2. Intentar red
    try {
      const netTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore profile timeout')), PROFILE_NET_TIMEOUT_MS)
      );
      const snap = await Promise.race([getDoc(userRef), netTimeout]);
      if (snap.exists()) {
        return snap.data() as AppUser;
      }
      // Documento no existe → usuario nuevo sin perfil
      return null;
    } catch (err) {
      console.warn('[useAuth] Error de red al cargar perfil:', err);
      return null;
    }
  }

  // Crear perfil de usuario en Firestore (primer login / Setup)
  async function createUserProfile(uid: string, nombre: string, storeName: string) {
    const profile: AppUser = {
      uid,
      nombre,
      rol: 'dueño',
      storeName,
    };
    try {
      await setDoc(doc(db, 'usuarios', uid), {
        ...profile,
        creadoEn: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[useAuth] No se pudo guardar en red (modo local activo):', err);
    }
    setAppUser(profile);
    return profile;
  }

  // Sign In
  async function signIn(email: string, password: string) {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err);
      setError(message);
      setLoading(false);
      throw err;
    }
  }

  // Sign Out
  async function signOut() {
    try {
      clearTimeout(retryTimerRef.current);
      await firebaseSignOut(auth);
      reset();
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
    }
  }

  return {
    firebaseUser,
    appUser,
    loading,
    error,
    isAuthenticated: !!firebaseUser,
    hasProfile: !!appUser,
    signIn,
    signOut,
    createUserProfile,
  };
}

// Mensajes de error amigables en español
function getAuthErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: string }).code;
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde.';
      case 'auth/network-request-failed':
        return 'Sin conexión. Verifica tu internet o desactiva tu AdBlocker.';
      case 'auth/invalid-email':
        return 'El formato del correo no es válido.';
      default:
        return 'Error al iniciar sesión. Intenta de nuevo.';
    }
  }
  return 'Error desconocido.';
}
