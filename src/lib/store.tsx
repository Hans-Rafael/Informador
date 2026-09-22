import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { HIDDEN_REPORTS_THRESHOLD, VALIDATED_THRESHOLD } from './categories';
import { DEFAULT_COORDS, distanceMeters } from './geo';
import { seedAlerts } from './seed';
import type { Alert, Coords, Filters, Site } from './types';

const STORAGE_KEY = 'infobarrio:v1';

type PersistedState = {
  alerts: Alert[];
  sites: Site[];
  filters: Filters;
  validatedIds: string[];
  reportedIds: string[];
};

const DEFAULT_FILTERS: Filters = {
  categories: [],
  date: 'todo',
  radius: 1000,
  onlyValidated: false,
  sortBy: 'fecha',
};

type NewAlert = Pick<Alert, 'category' | 'title' | 'description' | 'imageUri' | 'coords'>;

type Store = PersistedState & {
  ready: boolean;
  location: Coords;
  locationGranted: boolean;
  refreshLocation: () => Promise<void>;
  publishAlert: (alert: NewAlert) => Alert;
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
  });
  const [location, setLocation] = useState<Coords>(DEFAULT_COORDS);
  const [locationGranted, setLocationGranted] = useState(false);

  async function refreshLocation(): Promise<Coords> {
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
    }
  }

  useEffect(() => {
    (async () => {
      const [raw, coords] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
        refreshLocation(),
      ]);
      const saved: Partial<PersistedState> | null = raw ? JSON.parse(raw) : null;
      setState({
        alerts: saved?.alerts ?? seedAlerts(coords),
        sites: saved?.sites ?? [],
        filters: { ...DEFAULT_FILTERS, ...saved?.filters },
        validatedIds: saved?.validatedIds ?? [],
        reportedIds: saved?.reportedIds ?? [],
      });
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [ready, state]);

  const store: Store = {
    ...state,
    ready,
    location,
    locationGranted,
    refreshLocation: async () => {
      await refreshLocation();
    },
    publishAlert: (input) => {
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
    validateAlert: (id) =>
      setState((s) => {
        if (s.validatedIds.includes(id)) return s;
        return {
          ...s,
          validatedIds: [...s.validatedIds, id],
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, validations: a.validations + 1 } : a)),
        };
      }),
    reportAlert: (id) =>
      setState((s) => {
        if (s.reportedIds.includes(id)) return s;
        return {
          ...s,
          reportedIds: [...s.reportedIds, id],
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, reports: a.reports + 1 } : a)),
        };
      }),
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
