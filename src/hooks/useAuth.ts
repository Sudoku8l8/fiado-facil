// ============================================================
// Flash Fiado — useAuth Hook
// Sprint 1: Autenticación con email/password
// ============================================================
import { useEffect } from 'react';
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

export function useAuth() {
  const {
    firebaseUser, appUser, loading, error,
    setFirebaseUser, setAppUser, setLoading, setError, reset,
  } = useAuthStore();

  // Escuchar cambios de estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
        // Cargar datos del usuario desde Firestore (con timeout de seguridad para evitar spinner infinito)
        try {
          await loadAppUser(fbUser.uid);
        } catch (err) {
          console.error('[useAuth] loadAppUser failed:', err);
        }
      } else {
        reset();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Cargar perfil con timeout de 3.5 segundos para evitar cuelgues si AdBlock bloquea Firestore
  async function loadAppUser(uid: string) {
    const userRef = doc(db, 'usuarios', uid);

    try {
      // Intentar primero desde caché local (instancia sin bloqueo de red)
      const cacheSnap = await getDocFromCache(userRef).catch(() => null);
      if (cacheSnap && cacheSnap.exists()) {
        setAppUser(cacheSnap.data() as AppUser);
        return;
      }

      // Si no está en caché, intentar red con timeout de 3.5 segundos
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout - posible bloqueo de red/AdBlock')), 3500)
      );

      const snap = await Promise.race([getDoc(userRef), timeoutPromise]);
      if (snap.exists()) {
        setAppUser(snap.data() as AppUser);
      }
    } catch (err) {
      console.warn('[useAuth] No se pudo cargar el perfil desde Firestore (bloqueo de red o sin conexión):', err);
      // Crear perfil fallback en memoria temporal si la red está bloqueada por AdBlock
      setAppUser({
        uid,
        nombre: 'Usuario',
        rol: 'dueño',
        storeName: 'Mi Bodega',
      });
    }
  }

  // Crear perfil de usuario en Firestore (primer login)
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
