import { Camera, GeoJSONSource, Layer, Map, UserLocation, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

import { getCategory } from '@/lib/categories';
import { regionFor } from '@/lib/geo';
import type { Alert, Coords, Site } from '@/lib/types';

export type AlertMapProps = {
  center: Coords;
  radius: number;
  alerts?: Alert[];
  sites?: Site[];
  showsUserLocation?: boolean;
  onOpenAlert?: (alert: Alert) => void;
  /** Modo selección: muestra un pin y avisa cuando se toca otro punto del mapa. */
  picked?: Coords;
  onPick?: (coords: Coords) => void;
  style?: StyleProp<ViewStyle>;
};

// Mosaicos gratuitos de OpenStreetMap: no hace falta ninguna API key.
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

// Polígono que aproxima un círculo de `radius` metros alrededor de `center`.
function circlePolygon(center: Coords, radius: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const dLat = radius / 111320;
  const dLon = radius / (111320 * Math.cos((center.latitude * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([center.longitude + dLon * Math.cos(angle), center.latitude + dLat * Math.sin(angle)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

function Pin({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: '#FFFFFF',
      }}
    />
  );
}

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
  const area = useMemo(() => circlePolygon(center, radius), [center.latitude, center.longitude, radius]);
  const bounds = useMemo(() => {
    const r = regionFor(center, radius);
    return [
      center.longitude - r.longitudeDelta / 2,
      center.latitude - r.latitudeDelta / 2,
      center.longitude + r.longitudeDelta / 2,
      center.latitude + r.latitudeDelta / 2,
    ] as [number, number, number, number];
  }, [center.latitude, center.longitude, radius]);

  return (
    <Map
      style={[StyleSheet.absoluteFill, style]}
      mapStyle={MAP_STYLE}
      compass={false}
      onPress={
        onPick
          ? (e) => {
              const [longitude, latitude] = e.nativeEvent.lngLat;
              onPick({ latitude, longitude });
            }
          : undefined
      }
    >
      <Camera bounds={bounds} duration={400} />

      <GeoJSONSource id="area" data={area}>
        <Layer id="area-fill" type="fill" paint={{ 'fill-color': theme.colors.primary, 'fill-opacity': 0.08 }} />
        <Layer id="area-line" type="line" paint={{ 'line-color': theme.colors.primary, 'line-width': 1.5 }} />
      </GeoJSONSource>

      {showsUserLocation && <UserLocation />}

      {alerts.map((alert) => (
        <ViewAnnotation
          key={alert.id}
          id={`alert-${alert.id}`}
          lngLat={[alert.coords.longitude, alert.coords.latitude]}
          onPress={() => onOpenAlert?.(alert)}
        >
          <Pin color={getCategory(alert.category).color} />
        </ViewAnnotation>
      ))}

      {sites.map((site) => (
        <ViewAnnotation
          key={site.id}
          id={`site-${site.id}`}
          lngLat={[site.coords.longitude, site.coords.latitude]}
        >
          <Pin color={theme.colors.tertiary} size={18} />
        </ViewAnnotation>
      ))}

      {picked && (
        <ViewAnnotation id="picked" lngLat={[picked.longitude, picked.latitude]}>
          <Pin color={theme.colors.primary} size={26} />
        </ViewAnnotation>
      )}
    </Map>
  );
}
