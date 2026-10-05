import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { StyleProp, ViewStyle } from 'react-native';

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

// MapLibre es código nativo y no existe dentro de Expo Go: ahí mostramos un aviso
// para poder probar el resto de la app sin compilar un APK.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function AlertMap(props: AlertMapProps) {
  if (inExpoGo) {
    const { AlertMapPlaceholder } = require('./alert-map-placeholder');
    return <AlertMapPlaceholder {...props} />;
  }
  const { AlertMap: NativeAlertMap } = require('./alert-map-native');
  return <NativeAlertMap {...props} />;
}
