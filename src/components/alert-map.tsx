import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ActivityIndicator, Button, Card, Icon, IconButton, Text, useTheme } from 'react-native-paper';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { categoryTextColor, getCategory, SITE_TYPES } from '@/lib/categories';
import { isOnline } from '@/lib/connectivity';
import { MAP_ICON_PATHS } from '@/lib/map-icons';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { useStore } from '@/lib/store';
import type { Alert, Coords, Site } from '@/lib/types';

// Los tipos de la clase WebView no encajan con JSX en React 19: los reexponemos como componente.
const WebView = RNWebView as unknown as React.ForwardRefExoticComponent<
  WebViewProps & React.RefAttributes<RNWebView>
>;

export type AlertMapProps = {
  center: Coords;
  radius: number;
  alerts?: Alert[];
  sites?: Site[];
  showsUserLocation?: boolean;
  onOpenAlert?: (alert: Alert) => void;
  /** Modo selección: muestra un pin arrastrable y avisa cuando cambia. */
  picked?: Coords;
  onPick?: (coords: Coords) => void;
  /** false: vista fija que no captura gestos (para usarla dentro de un ScrollView). */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Pide a Leaflet repintar los mosaicos (al volver el internet con el mapa ya cargado).
const REDRAW = 'map.eachLayer(function (l) { if (l.redraw) l.redraw(); }); true;';
const RECHECK_MS = 10000;

// Mapa con Leaflet + OpenStreetMap dentro de un WebView: gratis y sin API key de Google.
// El HTML es fijo; los datos llegan por mensajes (así el mapa no se recarga en cada cambio).
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}.pin{display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.5)}.pin svg{display:block}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([0, 0], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).on('tileload', function () { post({ type: 'tiles' }); })
  .on('tileerror', function () { post({ type: 'tileerror' }); })
  .addTo(map);
var layer = L.layerGroup().addTo(map);
var pickMarker = null;
var data = null;
function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
function dot(color, size) {
  return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: '<div class="pin" style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';border:2px solid #fff;border-radius:50%"></div>' });
}
// Pin con ícono: círculo para alertas, cuadrado redondeado para sitios (la forma también distingue, no solo el color).
function pin(color, iconColor, ring, path, size, round) {
  var svg = '<svg width="' + (size * 0.6) + '" height="' + (size * 0.6) + '" viewBox="0 0 24 24"><path fill="' + iconColor + '" d="' + path + '"/></svg>';
  return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: '<div class="pin" style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';border:2px solid ' + ring + ';border-radius:' + (round ? '50%' : '7px') + '">' + svg + '</div>' });
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
function render(d) {
  var first = !data || data.center[0] !== d.center[0] || data.center[1] !== d.center[1] || data.radius !== d.radius;
  data = d;
  layer.clearLayers();
  var c = L.circle(d.center, { radius: d.radius, color: d.primary, weight: 1.5, fillColor: d.primary, fillOpacity: 0.08 }).addTo(layer);
  if (first) map.fitBounds(c.getBounds(), { animate: true });
  if (d.user) L.marker(d.user, { icon: dot('#1A73E8', 16), interactive: false }).addTo(layer);
  d.alerts.forEach(function (a) {
    var m = L.marker(a.coords, { icon: pin(a.color, d.onPin, d.ring, a.icon, 32, true) }).addTo(layer);
    if (d.selectable) m.on('click', function () { post({ type: 'select', id: a.id }); });
    else m.bindPopup('<b>' + esc(a.title) + '</b><br>' + esc(a.label));
  });
  d.sites.forEach(function (s) {
    L.marker(s.coords, { icon: pin(d.tertiary, d.onTertiary, d.ring, s.icon, 28, false) }).bindPopup('<b>' + esc(s.name) + '</b><br>' + esc(s.label)).addTo(layer);
  });
  if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }
  if (d.picked) {
    pickMarker = L.marker(d.picked, { icon: dot(d.primary, 26), draggable: true }).addTo(map);
    pickMarker.on('dragend', function () { var p = pickMarker.getLatLng(); post({ type: 'pick', latitude: p.lat, longitude: p.lng }); });
  }
}
map.on('click', function (e) {
  if (data && data.canPick) post({ type: 'pick', latitude: e.latlng.lat, longitude: e.latlng.lng });
  else post({ type: 'deselect' });
});
function onMsg(e) { try { render(JSON.parse(e.data)); } catch (_) {} }
document.addEventListener('message', onMsg);
window.addEventListener('message', onMsg);
post({ type: 'ready' });
</script></body></html>`;

export function AlertMap({
  center,
  radius,
  alerts = [],
  sites = [],
  showsUserLocation = true,
  onOpenAlert,
  picked,
  onPick,
  interactive = true,
  style,
}: AlertMapProps) {
  const theme = useTheme();
  const { location: user } = useStore();
  const ref = useRef<RNWebView>(null);
  const ready = useRef(false);
  const probing = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ok' | 'offline'>('loading');
  // Mapa ya cargado pero sin poder bajar mosaicos nuevos (se cortó el internet).
  const [partial, setPartial] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = alerts.find((a) => a.id === selectedId);

  const payload = useMemo(
    () =>
      JSON.stringify({
        center: [center.latitude, center.longitude],
        radius,
        primary: theme.colors.primary,
        tertiary: theme.colors.tertiary,
        onTertiary: theme.colors.onTertiary,
        // En modo oscuro: pines claros con ícono oscuro y borde del color de la superficie.
        onPin: theme.dark ? theme.colors.surface : '#FFFFFF',
        ring: theme.dark ? theme.colors.surface : '#FFFFFF',
        user: showsUserLocation ? [user.latitude, user.longitude] : null,
        canPick: !!onPick,
        selectable: !!onOpenAlert,
        picked: picked ? [picked.latitude, picked.longitude] : null,
        alerts: alerts.map((a) => {
          const cat = getCategory(a.category);
          return {
            id: a.id,
            title: a.title,
            label: cat.label,
            color: categoryTextColor(a.category, theme.dark),
            icon: MAP_ICON_PATHS[cat.icon],
            coords: [a.coords.latitude, a.coords.longitude],
          };
        }),
        sites: sites.map((s) => ({
          name: s.name,
          label: SITE_TYPES[s.type].label,
          icon: MAP_ICON_PATHS[SITE_TYPES[s.type].icon],
          coords: [s.coords.latitude, s.coords.longitude],
        })),
      }),
    [center, radius, alerts, sites, showsUserLocation, user, picked, onPick, onOpenAlert, theme],
  );

  // Si Leaflet o los mosaicos no cargan (sin internet), no dejamos un cuadro en blanco.
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('offline'), 10000);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  const retry = () => {
    ready.current = false;
    setPartial(false);
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  // Mientras no haya conexión, miramos cada pocos segundos si volvió y recuperamos el mapa solos.
  useEffect(() => {
    if (status !== 'offline' && !partial) return;
    const id = setInterval(async () => {
      if (!(await isOnline())) return;
      if (status === 'offline') retry();
      else ref.current?.injectJavaScript(REDRAW);
    }, RECHECK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, partial]);

  const send = () => ref.current?.injectJavaScript(`render(${payload});true;`);

  useEffect(() => {
    if (ready.current) send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg.type === 'ready') {
      ready.current = true;
      send();
    } else if (msg.type === 'tiles') {
      setStatus('ok');
      setPartial(false);
    } else if (msg.type === 'tileerror') {
      if (status !== 'ok') setStatus('offline');
      else if (!probing.current) {
        // Un mosaico suelto puede fallar con internet; solo avisamos si de verdad no hay conexión.
        probing.current = true;
        isOnline()
          .then((online) => !online && setPartial(true))
          .finally(() => (probing.current = false));
      }
    } else if (msg.type === 'pick') {
      onPick?.({ latitude: msg.latitude, longitude: msg.longitude });
    } else if (msg.type === 'select') {
      setSelectedId(msg.id);
    } else if (msg.type === 'deselect') {
      setSelectedId(undefined);
    }
  };

  const selectedCategory = selected && getCategory(selected.category);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <WebView
        key={attempt}
        ref={ref}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: 'https://localhost' }}
        onMessage={onMessage}
        onError={() => setStatus('offline')}
        onHttpError={() => setStatus((s) => (s === 'ok' ? s : 'offline'))}
        javaScriptEnabled
        domStorageEnabled
        overScrollMode="never"
        scrollEnabled={interactive}
        pointerEvents={interactive ? 'auto' : 'none'}
      />

      {status !== 'ok' && (
        <View style={[styles.overlay, { backgroundColor: theme.colors.surfaceVariant }]}>
          {status === 'loading' ? (
            <ActivityIndicator accessibilityLabel="Cargando mapa" />
          ) : (
            <>
              <Icon source="wifi-off" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Sin conexión: el mapa necesita internet. Volverá solo cuando la recuperes.
              </Text>
              <Button mode="contained-tonal" icon="refresh" onPress={retry} compact>
                Reintentar
              </Button>
            </>
          )}
        </View>
      )}

      {partial && status === 'ok' && (
        <View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: theme.colors.surfaceVariant }]}
          accessible
          accessibilityRole="alert"
        >
          <Icon source="wifi-off" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Sin conexión · el mapa puede verse incompleto
          </Text>
        </View>
      )}

      {selected && selectedCategory && onOpenAlert && (
        <Card mode="elevated" style={[styles.miniCard, partial && styles.miniCardLow]} onPress={() => onOpenAlert(selected)}>
          <View style={styles.miniRow}>
            <Icon source={selectedCategory.icon} size={28} color={categoryTextColor(selected.category, theme.dark)} />
            <View style={styles.miniText}>
              <Text variant="titleSmall" numberOfLines={1}>
                {selected.title}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {selectedCategory.label} · a {formatDistance(distanceMeters(user, selected.coords))} · Ver más
              </Text>
            </View>
            <IconButton icon="close" size={18} onPress={() => setSelectedId(undefined)} accessibilityLabel="Cerrar" />
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  pill: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, elevation: 4 },
  miniCard: { position: 'absolute', top: 12, left: 12, right: 12 },
  miniCardLow: { top: 52 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16 },
  miniText: { flex: 1 },
});
