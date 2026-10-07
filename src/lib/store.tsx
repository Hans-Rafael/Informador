import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { HIDDEN_REPORTS_THRESHOLD, VALIDATED_THRESHOLD } from './categories';
import { DEFAULT_COORDS, distanceMeters } from './geo';
import { getPushToken, type PushFailure } from './push';
import {
  disablePushRegistration,
  ensureUser,
  fetchAlerts,
  fetchMyVotes,
  publishRemote,
  reportRemote,
  savePushRegistration,
  validateRemote,
  type NewAlert,
} from './remote';
import { seedAlerts } from './seed';
import { remoteEnabled, supabase } from './supabase';
import type { Alert, Coords, Filters, Site } from './types';

const STORAGE_KEY = 'infobarrio:v1';

type PersistedState = {
  alerts: Alert[];
  sites: Site[];
  filters: Filters;
  validatedIds: string[];
  reportedIds: string[];
  /** false hasta que se completa la pantalla de bienvenida (primer uso). */
  onboarded: boolean;
  /** Recibir avisos de alertas nuevas dentro de tu radio (requiere servidor y permiso). */
  pushEnabled: boolean;
};

const DEFAULT_FILTERS: Filters = {
  categories: [],
  date: 'todo',
  radius: 1000,
  onlyValidated: false,
  sortBy: 'fecha',
};

type Store = PersistedState & {
  ready: boolean;
  location: Coords;
  locationGranted: boolean;
  /** true mientras se busca la ubicación (para mostrar un indicador de carga). */
  locating: boolean;
  refreshLocation: () => Promise<void>;
  /** Termina la bienvenida: pide la ubicación (si se acepta) y crea las alertas de ejemplo a su alrededor. */
  completeOnboarding: (askLocation: boolean) => Promise<void>;
  /** Activa o desactiva los avisos. Devuelve null si salió bien o el motivo del fallo. */
  setPushEnabled: (on: boolean) => Promise<PushFailure | null>;
  /** Vuelve a bajar las alertas del servidor (p. ej. al abrir una desde una notificación). */
  refreshAlerts: () => Promise<void>;
  /** Con servidor puede fallar (sin conexión): quien llama debe capturar el error. */
  publishAlert: (alert: NewAlert) => Promise<Alert>;
  validateAlert: (id: string) => void;
  reportAlert: (id: string) => void;
  addSite: (site: Omit<Site, 'id'>) => void;
  removeSite: (id: string) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
};

const StoreContext = createContext<Store | null>(null);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PersistedState>({
    alerts: [],
    sites: [],
    filters: DEFAULT_FILTERS,
    validatedIds: [],
    reportedIds: [],
    onboarded: true,
    pushEnabled: false,
  });
  const [location, setLocation] = useState<Coords>(DEFAULT_COORDS);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locating, setLocating] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  // Con servidor, la verdad está allí: bajamos alertas y tus votos. Si falla (sin red), se queda lo que había.
  async function syncRemote(center: Coords) {
    if (!remoteEnabled) return;
    try {
      const uid = userIdRef.current ?? (await ensureUser());
      if (!uid) return;
      userIdRef.current = uid;
      const [alerts, votes] = await Promise.all([fetchAlerts(center, uid), fetchMyVotes()]);
      setState((s) => ({ ...s, alerts, ...votes }));
    } catch {
      // sin conexión o servidor caído: se reintenta en el próximo ciclo
    }
  }

  const pushTokenRef = useRef<string | null>(null);

  /** Pide permiso y token; si todo va bien deja los avisos activados (el efecto de abajo los registra). */
  async function enablePush(): Promise<PushFailure | null> {
    if (!remoteEnabled) return 'error';
    const result = await getPushToken(true);
    if ('failure' in result) return result.failure;
    pushTokenRef.current = result.token;
    setState((s) => ({ ...s, pushEnabled: true }));
    return null;
  }

  async function refreshLocation(): Promise<Coords> {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationGranted(false);
        return DEFAULT_COORDS;
      }
      setLocationGranted(true);
      const last = await Location.getLastKnownPositionAsync();
      if (last) setLocation(last.coords);
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(current.coords);
      return current.coords;
    } catch {
      return DEFAULT_COORDS;
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      const saved: Partial<PersistedState> | null = raw ? JSON.parse(raw) : null;
      // Quien ya tenía datos guardados no ve la bienvenida; en el primer uso aún no se pide la
      // ubicación: se hace desde la bienvenida, tras explicar para qué se usa.
      const onboarded = saved ? (saved.onboarded ?? true) : false;
      const coords = onboarded ? await refreshLocation() : DEFAULT_COORDS;
      setState({
        // Con servidor se ignoran las alertas y votos guardados en el teléfono (eran de pruebas locales).
        alerts: remoteEnabled ? [] : saved?.alerts ?? (onboarded ? seedAlerts(coords) : []),
        sites: saved?.sites ?? [],
        filters: { ...DEFAULT_FILTERS, ...saved?.filters },
        validatedIds: remoteEnabled ? [] : saved?.validatedIds ?? [],
        reportedIds: remoteEnabled ? [] : saved?.reportedIds ?? [],
        onboarded,
        pushEnabled: remoteEnabled && (saved?.pushEnabled ?? false),
      });
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [ready, state]);

  // Sincroniza al abrir y cuando te mueves unos ~100 m.
  const locationKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  useEffect(() => {
    if (ready && state.onboarded) syncRemote(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.onboarded, locationKey]);

  // Mantiene el servidor al día con tu zona y radio para saber a quién avisar de cada alerta nueva.
  useEffect(() => {
    if (!remoteEnabled || !ready || !state.onboarded || !state.pushEnabled) return;
    (async () => {
      try {
        if (!pushTokenRef.current) {
          const result = await getPushToken(false);
          if ('failure' in result) return;
          pushTokenRef.current = result.token;
        }
        if (!(userIdRef.current ?? (await ensureUser()))) return;
        await savePushRegistration({
          token: pushTokenRef.current,
          center: locationRef.current,
          radius: state.filters.radius,
        });
      } catch {
        // sin conexión: se reintenta cuando cambie la zona o el radio, o al reabrir la app
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.onboarded, state.pushEnabled, state.filters.radius, locationKey]);

  // Alertas nuevas de otros vecinos: en vivo, al volver a la app y cada minuto como respaldo.
  useEffect(() => {
    if (!supabase || !ready || !state.onboarded) return;
    const refetch = () => syncRemote(locationRef.current);
    const channel = supabase
      .channel('alerts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, refetch)
      .subscribe();
    const appState = AppState.addEventListener('change', (next) => next === 'active' && refetch());
    const timer = setInterval(refetch, 60000);
    return () => {
      supabase?.removeChannel(channel);
      appState.remove();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.onboarded]);

  const store: Store = {
    ...state,
    ready,
    location,
    locationGranted,
    locating,
    refreshLocation: async () => {
      await refreshLocation();
    },
    completeOnboarding: async (askLocation) => {
      const coords = askLocation ? await refreshLocation() : DEFAULT_COORDS;
      setState((s) => ({
        ...s,
        onboarded: true,
        alerts: remoteEnabled || s.alerts.length > 0 ? s.alerts : seedAlerts(coords),
      }));
      // Quien acepta la ubicación en la bienvenida también recibe avisos (si da el permiso).
      if (askLocation && remoteEnabled) void enablePush();
    },
    setPushEnabled: async (on) => {
      if (on) return enablePush();
      setState((s) => ({ ...s, pushEnabled: false }));
      disablePushRegistration().catch(() => {});
      return null;
    },
    refreshAlerts: () => syncRemote(locationRef.current),
    publishAlert: async (input) => {
      if (remoteEnabled) {
        const uid = userIdRef.current ?? (await ensureUser());
        if (!uid) throw new Error('No se pudo identificar al dispositivo');
        userIdRef.current = uid;
        const published = await publishRemote(input, uid);
        setState((s) => ({ ...s, alerts: [published, ...s.alerts] }));
        return published;
      }
      const alert: Alert = {
        ...input,
        id: newId(),
        createdAt: Date.now(),
        author: { name: 'Vos', rating: 5, contributions: state.alerts.filter((a) => a.mine).length + 1 },
        validations: 0,
        reports: 0,
        mine: true,
      };
      setState((s) => ({ ...s, alerts: [alert, ...s.alerts] }));
      return alert;
    },
    // Validar y reportar se reflejan al instante; con servidor, si este los rechaza (sin red o
    // porque la alerta es tuya) se deshace el cambio.
    validateAlert: (id) => {
      if (state.validatedIds.includes(id)) return;
      setState((s) => ({
        ...s,
        validatedIds: [...s.validatedIds, id],
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, validations: a.validations + 1 } : a)),
      }));
      if (remoteEnabled) {
        validateRemote(id).catch(() =>
          setState((s) => ({
            ...s,
            validatedIds: s.validatedIds.filter((x) => x !== id),
            alerts: s.alerts.map((a) => (a.id === id ? { ...a, validations: a.validations - 1 } : a)),
          })),
        );
      }
    },
    reportAlert: (id) => {
      if (state.reportedIds.includes(id)) return;
      setState((s) => ({
        ...s,
        reportedIds: [...s.reportedIds, id],
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, reports: a.reports + 1 } : a)),
      }));
      if (remoteEnabled) {
        reportRemote(id).catch(() =>
          setState((s) => ({
            ...s,
            reportedIds: s.reportedIds.filter((x) => x !== id),
            alerts: s.alerts.map((a) => (a.id === id ? { ...a, reports: a.reports - 1 } : a)),
          })),
        );
      }
    },
    addSite: (site) => setState((s) => ({ ...s, sites: [...s.sites, { ...site, id: newId() }] })),
    removeSite: (id) => setState((s) => ({ ...s, sites: s.sites.filter((x) => x.id !== id) })),
    setFilters: (filters) => setState((s) => ({ ...s, filters: { ...s.filters, ...filters } })),
    resetFilters: () => setState((s) => ({ ...s, filters: { ...DEFAULT_FILTERS, radius: s.filters.radius } })),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return store;
}

export function isValidated(alert: Alert) {
  return alert.validations >= VALIDATED_THRESHOLD;
}

// Las alertas de ejemplo (seed.ts) llevan id "seed-N": se marcan para no confundirlas con noticias reales.
export function isDemo(alert: Alert) {
  return alert.id.startsWith('seed-');
}

export type AlertWithDistance = Alert & { distance: number };

// Alertas visibles (sin las ocultas por moderación) con su distancia a `center`.
export function useAlertsNear(center: Coords, radius: number, applyFilters = false): AlertWithDistance[] {
  const { alerts, filters } = useStore();
  return useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const minDate =
      filters.date === 'hoy' ? Date.now() - dayMs : filters.date === 'semana' ? Date.now() - 7 * dayMs : 0;
    const list = alerts
      .filter((a) => a.reports < HIDDEN_REPORTS_THRESHOLD)
      .map((a) => ({ ...a, distance: distanceMeters(center, a.coords) }))
      .filter((a) => a.distance <= radius)
      .filter(
        (a) =>
          !applyFilters ||
          ((filters.categories.length === 0 || filters.categories.includes(a.category)) &&
            a.createdAt >= minDate &&
            (!filters.onlyValidated || isValidated(a))),
      );
    const byDistance = applyFilters && filters.sortBy === 'cercania';
    return list.sort((a, b) => (byDistance ? a.distance - b.distance : b.createdAt - a.createdAt));
  }, [alerts, filters, center, radius, applyFilters]);
}
