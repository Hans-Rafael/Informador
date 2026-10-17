import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { isValidated } from '@/lib/store';
import type { Alert } from '@/lib/types';

type Status = { icon: string; label: string; color: string };

// Una alerta reportada (aún visible, se oculta con 3 reportes) pesa más que su estado de validación.
export function alertStatus(alert: Alert): Status {
  if (alert.reports > 0) return { icon: 'eye', label: 'Reportada', color: '#C62828' };
  if (isValidated(alert)) return { icon: 'check-decagram', label: 'Validada', color: '#2E7D32' };
  return { icon: 'check-decagram-outline', label: 'Sin validar', color: '#B26A00' };
}

export function StatusBadge({ alert, size = 14 }: { alert: Alert; size?: number }) {
  const { icon, label, color } = alertStatus(alert);
  return (
    <View style={styles.badge}>
      <Icon source={icon} size={size} color={color} />
      <Text variant="labelSmall" style={{ color, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
