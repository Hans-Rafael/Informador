import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import type { AlertMapProps } from './alert-map';

// react-native-maps no funciona en web: mostramos un aviso en su lugar.
export function AlertMap({ alerts = [], style }: AlertMapProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: theme.colors.surfaceVariant },
        style,
      ]}
    >
      <Icon source="map-marker-radius" size={40} color={theme.colors.primary} />
      <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Mapa disponible en la app móvil
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} en el radio seleccionado
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 8 },
});
