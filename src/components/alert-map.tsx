import { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Circle, Marker, UrlTile } from 'react-native-maps';
import { useTheme } from 'react-native-paper';

import { getCategory, SITE_TYPES } from '@/lib/categories';
import { regionFor } from '@/lib/geo';
import type { Alert, Coords, Site } from '@/lib/types';

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
  const ref = useRef<MapView>(null);

  useEffect(() => {
    ref.current?.animateToRegion(regionFor(center, radius), 400);
  }, [center.latitude, center.longitude, radius]);

  return (
    <MapView
      ref={ref}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={regionFor(center, radius)}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      // Sin mosaicos de Google: dibujamos OpenStreetMap (gratis) encima de un mapa vacío.
      mapType="none"
      toolbarEnabled={false}
      userInterfaceStyle={theme.dark ? 'dark' : 'light'}
      onPress={onPick ? (e) => onPick(e.nativeEvent.coordinate) : undefined}
    >
      <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} zIndex={-1} />
      <Circle
        center={center}
        radius={radius}
        strokeColor={theme.colors.primary}
        strokeWidth={1.5}
        fillColor={theme.dark ? 'rgba(79,216,235,0.08)' : 'rgba(0,104,116,0.08)'}
      />
      {alerts.map((alert) => (
        <Marker
          key={alert.id}
          coordinate={alert.coords}
          pinColor={getCategory(alert.category).color}
          title={alert.title}
          description={`${getCategory(alert.category).label} · Tocá para ver más`}
          onCalloutPress={() => onOpenAlert?.(alert)}
        />
      ))}
      {sites.map((site) => (
        <Marker
          key={site.id}
          coordinate={site.coords}
          pinColor={theme.colors.tertiary}
          title={site.name}
          description={SITE_TYPES[site.type].label}
        />
      ))}
      {picked && (
        <Marker
          coordinate={picked}
          draggable
          pinColor={theme.colors.primary}
          onDragEnd={(e) => onPick?.(e.nativeEvent.coordinate)}
        />
      )}
    </MapView>
  );
}
