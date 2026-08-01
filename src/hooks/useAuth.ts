// ============================================================
// Flash Fiado — useAuth Hook
// Autenticación con email/password y sincronización en tiempo real de perfil
// ============================================================
import { useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDocFromCache,
  setDoc,
  onSnapshot,
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

  // Flag para saber si ya se completó al menos una lectura de Firestore del perfil
  // Esto evita mostrar la pantalla de Setup mientras el perfil aún está cargando
  const profileLoaded = useRef(false);

  // Escuchar estado de autenticación y sincronizar el perfil de usuario en tiempo real
  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        profileLoaded.current = false; // reset al cambiar de usuario
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });

        const userRef = doc(db, 'usuarios', fbUser.uid);

        // 1. Intentar respuesta ultra-rápida desde caché local (dispositivos previamente usados)
        try {
          const cacheSnap = await getDocFromCache(userRef);
          if (cacheSnap.exists()) {
            setAppUser(cacheSnap.data() as AppUser);
            profileLoaded.current = true;
            setLoading(false);
          }
        } catch {
          // Sin caché local aún (dispositivo nuevo) — esperar a Firestore
        }

        // 2. Suscribirse en tiempo real al documento de perfil del usuario en Firestore
        unsubProfile = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              setAppUser(snap.data() as AppUser);
            } else {
              // Solo marcar sin perfil si ya se confirmó que no existe en Firestore
              setAppUser(null);
            }
            profileLoaded.current = true;
            setLoading(false);
          },
          (err) => {
            console.warn('[useAuth] Error al sincronizar el perfil desde Firestore:', err);
            // En caso de error de red, no forzar Setup si ya teníamos datos en caché
            if (!profileLoaded.current) {
              setLoading(false);
            }
          }
        );
      } else {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = undefined;
        }
        profileLoaded.current = false;
        reset();
      }
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, []);

  // Crear perfil de usuario en Firestore (solo en el primer registro / Setup inicial)
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
      console.warn('[useAuth] Error al guardar el perfil en Firestore:', err);
    }
    setAppUser(profile);
    return profile;
  }

  // Iniciar sesión con email y contraseña
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

  // Cerrar sesión
  async function signOut() {
    try {
      await firebaseSignOut(auth);
      reset();
    } catch (err) {
      console.error('[useAuth] Error al cerrar sesión:', err);
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
