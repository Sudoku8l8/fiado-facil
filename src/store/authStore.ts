// ============================================================
// Flash Fiado — Auth Store (Zustand)
// ============================================================
import { create } from 'zustand';
import type { AppUser, FirebaseUser } from '../types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;

  setFirebaseUser: (user: FirebaseUser | null) => void;
  setAppUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  appUser: null,
  loading: true,
  error: null,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setAppUser:      (user) => set({ appUser: user }),
  setLoading:      (loading) => set({ loading }),
  setError:        (error) => set({ error }),
  reset: () => set({ firebaseUser: null, appUser: null, loading: false, error: null }),
}));
