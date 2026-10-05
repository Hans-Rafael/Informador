import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { getCategory } from '@/lib/categories';
import { regionFor } from '@/lib/geo';
import type { AlertMapProps } from './alert-map';

// react-native-maps no funciona en web: usamos Leaflet + OpenStreetMap, cargado desde CDN.
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = () => resolve(w.L);
      script.onerror = () => {
        leafletPromise = null;
        reject(new Error('No se pudo cargar el mapa'));
      };
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}

export function AlertMap({
  center,
  radius,
  alerts = [],
  sites = [],
  onOpenAlert,
  picked,
  onPick,
  style,
}: AlertMapProps) {
  const theme = useTheme();
  const hostRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Último callback disponible, sin recrear el mapa cuando cambia.
  const callbacks = useRef({ onOpenAlert, onPick });
  callbacks.current = { onOpenAlert, onPick };

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !hostRef.current || mapRef.current) return;
        const map = L.map(hostRef.current, { zoomControl: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        map.on('click', (e: any) =>
          callbacks.current.onPick?.({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
        );
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;

    layer.clearLayers();
    L.circle([center.latitude, center.longitude], {
      radius,
      color: theme.colors.primary,
      weight: 1.5,
      fillOpacity: 0.08,
    }).addTo(layer);
    L.circleMarker([center.latitude, center.longitude], {
      radius: 6,
      color: '#fff',
      weight: 2,
      fillColor: '#1976D2',
      fillOpacity: 1,
    }).addTo(layer);

    alerts.forEach((alert) => {
      const category = getCategory(alert.category);
      const marker = L.circleMarker([alert.coords.latitude, alert.coords.longitude], {
        radius: 10,
        color: '#fff',
        weight: 2,
        fillColor: category.color,
        fillOpacity: 1,
      }).addTo(layer);
      marker.bindTooltip(`${category.label}: ${alert.title}`);
      marker.on('click', () => callbacks.current.onOpenAlert?.(alert));
    });

    sites.forEach((site) => {
      L.circleMarker([site.coords.latitude, site.coords.longitude], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: theme.colors.tertiary,
        fillOpacity: 1,
      })
        .bindTooltip(site.name)
        .addTo(layer);
    });

    if (picked) {
      L.circleMarker([picked.latitude, picked.longitude], {
        radius: 10,
        color: '#fff',
        weight: 2,
        fillColor: theme.colors.primary,
        fillOpacity: 1,
      }).addTo(layer);
    }
  }, [ready, center.latitude, center.longitude, radius, alerts, sites, picked, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const r = regionFor(center, radius);
    map.fitBounds([
      [r.latitude - r.latitudeDelta / 2, r.longitude - r.longitudeDelta / 2],
      [r.latitude + r.latitudeDelta / 2, r.longitude + r.longitudeDelta / 2],
    ]);
  }, [ready, center.latitude, center.longitude, radius]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceVariant }, style]}>
      <View ref={hostRef} style={StyleSheet.absoluteFill} />
      {!ready && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {failed ? 'No se pudo cargar el mapa (sin conexión)' : 'Cargando mapa…'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
