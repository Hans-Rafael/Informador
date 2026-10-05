import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { getCategory, SITE_TYPES } from '@/lib/categories';
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
  style?: StyleProp<ViewStyle>;
};

// Mapa con Leaflet + OpenStreetMap dentro de un WebView: gratis y sin API key de Google.
// El HTML es fijo; los datos llegan por mensajes (así el mapa no se recarga en cada cambio).
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}.pin{border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.5)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([0, 0], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);
var layer = L.layerGroup().addTo(map);
var pickMarker = null;
var data = null;
function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
function dot(color, size) {
  return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: '<div class="pin" style="width:' + size + 'px;height:' + size + 'px;background:' + color + '"></div>' });
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
    L.marker(a.coords, { icon: dot(a.color, 22) })
      .bindPopup('<b>' + esc(a.title) + '</b><br>' + esc(a.label) + ' · <a href="#" onclick="post({type:\\'open\\',id:\\'' + a.id + '\\'});return false">Ver más</a>')
      .addTo(layer);
  });
  d.sites.forEach(function (s) {
    L.marker(s.coords, { icon: dot(d.tertiary, 18) }).bindPopup('<b>' + esc(s.name) + '</b><br>' + esc(s.label)).addTo(layer);
  });
  if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }
  if (d.picked) {
    pickMarker = L.marker(d.picked, { icon: dot(d.primary, 24), draggable: true }).addTo(map);
    pickMarker.on('dragend', function () { var p = pickMarker.getLatLng(); post({ type: 'pick', latitude: p.lat, longitude: p.lng }); });
  }
}
map.on('click', function (e) { if (data && data.canPick) post({ type: 'pick', latitude: e.latlng.lat, longitude: e.latlng.lng }); });
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
  style,
}: AlertMapProps) {
  const theme = useTheme();
  const { location: user } = useStore();
  const ref = useRef<RNWebView>(null);
  const ready = useRef(false);

  const payload = useMemo(
    () =>
      JSON.stringify({
        center: [center.latitude, center.longitude],
        radius,
        primary: theme.colors.primary,
        tertiary: theme.colors.tertiary,
        user: showsUserLocation ? [user.latitude, user.longitude] : null,
        canPick: !!onPick,
        picked: picked ? [picked.latitude, picked.longitude] : null,
        alerts: alerts.map((a) => {
          const cat = getCategory(a.category);
          return {
            id: a.id,
            title: a.title,
            label: cat.label,
            color: cat.color,
            coords: [a.coords.latitude, a.coords.longitude],
          };
        }),
        sites: sites.map((s) => ({
          name: s.name,
          label: SITE_TYPES[s.type].label,
          coords: [s.coords.latitude, s.coords.longitude],
        })),
      }),
    [center, radius, alerts, sites, showsUserLocation, user, picked, onPick, theme],
  );

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
    } else if (msg.type === 'pick') {
      onPick?.({ latitude: msg.latitude, longitude: msg.longitude });
    } else if (msg.type === 'open') {
      const alert = alerts.find((a) => a.id === msg.id);
      if (alert) onOpenAlert?.(alert);
    }
  };

  return (
    <WebView
      ref={ref}
      style={[StyleSheet.absoluteFill, style]}
      originWhitelist={['*']}
      source={{ html: HTML, baseUrl: 'https://localhost' }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      overScrollMode="never"
    />
  );
}
