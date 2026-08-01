// ============================================================
// Flash Fiado — Client Store (Zustand)
// ============================================================
import { create } from 'zustand';
import type { Client, Movement } from '../types';

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  movements: Movement[];
  loading: boolean;
  searchQuery: string;

  setClients:       (clients: Client[]) => void;
  setSelectedClient:(client: Client | null) => void;
  setMovements:     (movements: Movement[]) => void;
  setLoading:       (loading: boolean) => void;
  setSearchQuery:   (q: string) => void;

  // Totales derivados
  getTotalDebt:     () => number;
  getFilteredClients: () => Client[];
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  selectedClient: null,
  movements: [],
  loading: false,
  searchQuery: '',

  setClients:        (clients) => set({ clients }),
  setSelectedClient: (client)  => set({ selectedClient: client }),
  setMovements:      (movements) => set({ movements }),
  setLoading:        (loading) => set({ loading }),
  setSearchQuery:    (q) => set({ searchQuery: q }),

  getTotalDebt: () =>
    get().clients.reduce((sum, c) => sum + (c.deudaTotal || 0), 0),

  getFilteredClients: () => {
    const { clients, searchQuery } = get();
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter((c) => c.nombre.toLowerCase().includes(q));
  },
}));
