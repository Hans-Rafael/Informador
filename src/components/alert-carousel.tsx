import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { AlertCard } from '@/components/alert-card';
import type { AlertWithDistance } from '@/lib/store';

// Más puntos que esto no se distinguen: pasamos a un contador "3 / 12".
const MAX_DOTS = 8;

/** Carrusel horizontal de alertas, una tarjeta por página, con indicador de posición. */
export function AlertCarousel({ alerts }: { alerts: AlertWithDistance[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  // Si cambian los filtros o el radio, la lista vuelve a empezar desde la primera.
  useEffect(() => setIndex(0), [alerts.length]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const current = Math.min(index, alerts.length - 1);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          key={alerts.length}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={alerts}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <View style={{ width }}>
              <AlertCard alert={item} />
            </View>
          )}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onScrollEnd}
        />
      )}

      {alerts.length > 1 && (
        <View
          style={styles.indicator}
          accessible
          accessibilityLabel={`Alerta ${current + 1} de ${alerts.length}`}
        >
          {alerts.length <= MAX_DOTS ? (
            alerts.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.dot,
                  i === current
                    ? { width: 20, backgroundColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
            ))
          ) : (
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {current + 1} / {alerts.length}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
