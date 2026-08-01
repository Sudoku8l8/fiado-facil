// ============================================================
// Flash Fiado — useFirestore Hook
// CRUD de clientes y movimientos con resiliencia offline y estimación de timestamps
// ============================================================
import { useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  onSnapshot,
  query,
  serverTimestamp,
  increment,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useClientStore } from '../store/clientStore';
import type { Client, Movement, MovementItem, MovementType } from '../types';

export function useFirestore() {
  const { appUser } = useAuthStore();
  const { setClients, setMovements, setLoading } = useClientStore();

  // Identificador único e inmutable del usuario — nunca tiene valor por defecto ambiguo
  const userId = appUser?.uid ?? null;
  const storeName = appUser?.storeName ?? 'Mi Bodega';

  // ----------------------------------------------------------------
  // Clientes
  // ----------------------------------------------------------------

  /** Suscribirse en tiempo real a la lista de clientes del usuario */
  function subscribeClients(onError?: (err: Error) => void) {
    // Esperar a que el userId esté disponible (perfil ya cargado desde Firestore)
    if (!userId) return () => {};

    // Solo filtramos por userId — sin orderBy para evitar requerir índice compuesto.
    // El ordenamiento se hace localmente (la lista de clientes de una bodega es pequeña).
    const q = query(
      collection(db, 'clientes'),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const currentClientsMap = new Map(
          useClientStore.getState().clients.map((c) => [c.id, c])
        );

        const clients: Client[] = snapshot.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          const rawDate = data.fechaUltimoMovimiento;
          let lastMoveDate: Date | null = null;
          if (rawDate?.toDate) {
            lastMoveDate = rawDate.toDate();
          } else if (rawDate instanceof Date) {
            lastMoveDate = rawDate;
          }

          const existing = currentClientsMap.get(d.id);
          const debtVal =
            typeof data.deudaTotal === 'number' && !isNaN(data.deudaTotal)
              ? data.deudaTotal
              : existing?.deudaTotal ?? 0;

          return {
            id: d.id,
            nombre: data.nombre ?? existing?.nombre ?? 'Cliente',
            deudaTotal: debtVal,
            fechaUltimoMovimiento: lastMoveDate || existing?.fechaUltimoMovimiento || null,
            storeName: data.storeName ?? storeName,
          };
        });

        // Ordenar localmente por deuda descendente (evita índice compuesto en Firestore)
        clients.sort((a, b) => b.deudaTotal - a.deudaTotal);
        setClients(clients);
        setLoading(false);
      },
      (err) => {
        console.warn('[useFirestore] subscribeClients error (modo sin conexión/bloqueo):', err);
        onError?.(err);
        setLoading(false);
      }
    );
  }

  /** Obtener o crear un cliente por nombre con soporte de caché e in-memory */
  async function getOrCreateClient(nombre: string): Promise<string> {
    if (!userId) throw new Error('Usuario no autenticado');

    const normName = nombre.trim();
    const lowerName = normName.toLowerCase();

    // 1. Buscar en memoria (Zustand) primero para respuesta instantánea (0ms)
    const currentClients = useClientStore.getState().clients;
    const inMemory = currentClients.find(
      (c) => c.nombre.toLowerCase() === lowerName
    );
    if (inMemory) {
      return inMemory.id;
    }

    // Filtrar por userId (UID único), no por storeName
    const q = query(
      collection(db, 'clientes'),
      where('userId', '==', userId),
      where('nombreLower', '==', lowerName)
    );

    // 2. Buscar en caché local de Firestore
    try {
      const cacheSnap = await getDocsFromCache(q);
      if (!cacheSnap.empty) {
        return cacheSnap.docs[0].id;
      }
    } catch {
      // Ignorar si no está en caché
    }

    // 3. Buscar en la red con un timeout de 2.5 segundos
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      const snap = await Promise.race([getDocs(q), timeoutPromise]);
      if (!snap.empty) {
        return snap.docs[0].id;
      }
    } catch (err) {
      console.warn('[useFirestore] getOrCreateClient query fallback local:', err);
    }

    // 4. Si no existe, crear nuevo documento de cliente (compatible offline/AdBlock)
    const clientRef = doc(collection(db, 'clientes'));
    const newClientData = {
      nombre: normName,
      nombreLower: lowerName,
      deudaTotal: 0,
      fechaUltimoMovimiento: serverTimestamp(),
      // Guardar AMBOS: userId para identificación segura, storeName para mostrar en UI
      userId,
      storeName,
      creadoEn: serverTimestamp(),
    };

    const writeTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Write timeout')), 3000)
    );

    try {
      await Promise.race([setDoc(clientRef, newClientData), writeTimeout]);
    } catch (err) {
      console.warn('[useFirestore] setDoc client network timeout, guardado localmente:', err);
    }

    return clientRef.id;
  }

  // ----------------------------------------------------------------
  // Movimientos
  // ----------------------------------------------------------------

  /** Suscribirse a los movimientos de un cliente */
  function subscribeMovements(clientId: string, onError?: (err: Error) => void) {
    const q = query(
      collection(db, 'clientes', clientId, 'movimientos')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const movements: Movement[] = snapshot.docs.map((d) => {
          // Usar { serverTimestamps: 'estimate' } para evitar fechas nulas durante escrituras locales pendientes
          const data = d.data({ serverTimestamps: 'estimate' });
          const rawDate = data.fecha;
          let dateObj: Date;
          if (rawDate?.toDate) {
            dateObj = rawDate.toDate();
          } else if (rawDate instanceof Date) {
            dateObj = rawDate;
          } else if (typeof rawDate === 'number') {
            dateObj = new Date(rawDate);
          } else {
            dateObj = new Date();
          }

          return {
            id: d.id,
            clientId,
            tipo: data.tipo as MovementType,
            items: data.items as MovementItem[] | undefined,
            producto: data.producto,
            unidades: data.unidades,
            monto: data.monto,
            fecha: dateObj,
            registradoPor: data.registradoPor,
            registradoPorUid: data.registradoPorUid,
          };
        });

        // Ordenar localmente por fecha descendente
        movements.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        setMovements(movements);
      },
      (err) => {
        console.warn('[useFirestore] subscribeMovements error:', err);
        onError?.(err);
      }
    );
  }

  /** Registrar una deuda con resiliencia a timeouts de red y soporte multi-producto */
  const addDebt = useCallback(
    async (params: {
      clienteNombre: string;
      items?: MovementItem[];
      producto?: string;
      unidades?: number;
      monto: number;
    }) => {
      const activeUser = appUser || {
        uid: 'local-user',
        nombre: 'Usuario',
        rol: 'dueño' as const,
        storeName: storeName || 'Mi Bodega',
      };

      const clientId = await getOrCreateClient(params.clienteNombre);

      const movRef = doc(collection(db, 'clientes', clientId, 'movimientos'));

      const itemsList = params.items ?? [];
      const productSummary = params.producto || (itemsList.length > 0
        ? itemsList.map(i => `${i.unidades > 1 ? i.unidades + ' ' : ''}${i.producto}`).join(', ')
        : '');

      const totalUnits = params.unidades || (itemsList.length > 0
        ? itemsList.reduce((sum, i) => sum + i.unidades, 0)
        : 1);

      const movData = {
        tipo: 'deuda',
        items: itemsList,
        producto: productSummary,
        unidades: totalUnits,
        monto: params.monto,
        fecha: serverTimestamp(),
        registradoPor: activeUser.nombre,
        registradoPorUid: activeUser.uid,
      };

      const clientRef = doc(db, 'clientes', clientId);

      // Actualización optimista instantánea en el store local (0ms UI latency)
      useClientStore.getState().updateClientDebt(clientId, params.monto);

      const writeTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Write timeout')), 3000)
      );

      try {
        await Promise.race([
          Promise.all([
            setDoc(movRef, movData),
            updateDoc(clientRef, {
              deudaTotal: increment(params.monto),
              fechaUltimoMovimiento: serverTimestamp(),
            }),
          ]),
          writeTimeout,
        ]);
      } catch (err) {
        console.warn('[useFirestore] addDebt write timeout (guardado localmente):', err);
      }

      return clientId;
    },
    [appUser, storeName]
  );

  /** Registrar un abono (pago parcial) con resiliencia */
  const addPayment = useCallback(
    async (params: { clientId: string; monto: number }) => {
      const activeUser = appUser || {
        uid: 'local-user',
        nombre: 'Usuario',
        rol: 'dueño' as const,
        storeName: storeName || 'Mi Bodega',
      };

      // Obtener deuda actual desde memoria/caché primero
      let currentDebt = 0;
      const inMemoryClient = useClientStore.getState().clients.find((c) => c.id === params.clientId);
      if (inMemoryClient) {
        currentDebt = inMemoryClient.deudaTotal ?? 0;
      } else {
        try {
          const cacheSnap = await getDocFromCache(doc(db, 'clientes', params.clientId));
          currentDebt = cacheSnap.data({ serverTimestamps: 'estimate' })?.deudaTotal ?? 0;
        } catch {
          const snap = await Promise.race([
            getDoc(doc(db, 'clientes', params.clientId)),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
          ]).catch(() => null);
          currentDebt = snap?.data({ serverTimestamps: 'estimate' })?.deudaTotal ?? 0;
        }
      }

      const adjustedAmount = Math.min(params.monto, currentDebt);

      const movRef = doc(collection(db, 'clientes', params.clientId, 'movimientos'));
      const clientRef = doc(db, 'clientes', params.clientId);

      // Actualización optimista instantánea en el store local (0ms UI latency)
      useClientStore.getState().updateClientDebt(params.clientId, -adjustedAmount);

      const writeTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Write timeout')), 3000)
      );

      try {
        await Promise.race([
          Promise.all([
            setDoc(movRef, {
              tipo: 'abono',
              monto: adjustedAmount,
              fecha: serverTimestamp(),
              registradoPor: activeUser.nombre,
              registradoPorUid: activeUser.uid,
            }),
            updateDoc(clientRef, {
              deudaTotal: increment(-adjustedAmount),
              fechaUltimoMovimiento: serverTimestamp(),
            }),
          ]),
          writeTimeout,
        ]);
      } catch (err) {
        console.warn('[useFirestore] addPayment write timeout (guardado localmente):', err);
      }
    },
    [appUser, storeName]
  );

  /** Eliminar cliente (solo si deudaTotal === 0) */
  const deleteClient = useCallback(
    async (clientId: string) => {
      const client = useClientStore.getState().clients.find((c) => c.id === clientId);
      if (client && client.deudaTotal > 0) {
        throw new Error(
          `No se puede eliminar a un cliente con deuda pendiente (S/ ${client.deudaTotal.toFixed(2)}).`
        );
      }

      const clientRef = doc(db, 'clientes', clientId);
      const writeTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Write timeout')), 3000)
      );

      try {
        await Promise.race([deleteDoc(clientRef), writeTimeout]);
      } catch (err) {
        console.warn('[useFirestore] deleteDoc client network timeout (eliminado localmente):', err);
      }
    },
    []
  );

  return {
    subscribeClients,
    subscribeMovements,
    getOrCreateClient,
    addDebt,
    addPayment,
    deleteClient,
  };
}
