import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Chip,
  Divider,
  IconButton,
  SegmentedButtons,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCard } from '@/components/alert-card';
import { CategoryChips } from '@/components/category-chips';
import { EmptyState } from '@/components/empty-state';
import { RADIUS_OPTIONS } from '@/lib/categories';
import type { PushFailure } from '@/lib/push';
import { remoteEnabled } from '@/lib/supabase';
import { formatRadius } from '@/lib/geo';
import { useAlertsNear, useStore } from '@/lib/store';
import type { CategoryId, DateFilter, SortBy } from '@/lib/types';

export default function AlertasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { location, filters, setFilters, resetFilters, pushEnabled, setPushEnabled } = useStore();
  const alerts = useAlertsNear(location, filters.radius, true);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters =
    filters.categories.length + (filters.date !== 'todo' ? 1 : 0) + (filters.onlyValidated ? 1 : 0);

  // El radio no cuenta como filtro: es un ajuste de zona, no se "quita".
  const clearFilters = () => setFilters({ categories: [], date: 'todo', onlyValidated: false });

  const PUSH_ERRORS: Record<PushFailure, string> = {
    denied: 'Activá las notificaciones de InfoBarrio en los ajustes del teléfono y volvé a intentarlo.',
    'no-device': 'Las notificaciones no funcionan en el emulador: probalo en un teléfono.',
    error: 'No pudimos activar los avisos. Revisá tu conexión e intentá de nuevo.',
  };
  async function togglePush(on: boolean) {
    const failure = await setPushEnabled(on);
    if (failure) Alert.alert('No se activaron los avisos', PUSH_ERRORS[failure]);
  }

  const toggleCategory = (id: CategoryId) =>
    setFilters({
      categories: filters.categories.includes(id)
        ? filters.categories.filter((c) => c !== id)
        : [...filters.categories, id],
    });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Alertas" />
        <Appbar.Action
          icon={activeFilters > 0 ? 'filter' : 'filter-outline'}
          onPress={() => setShowFilters(true)}
          accessibilityLabel="Filtros"
        />
      </Appbar.Header>

      {/* Acceso rápido por categoría */}
      <CategoryChips selected={filters.categories} onToggle={toggleCategory} />

      <View style={styles.summaryRow}>
        <Text variant="labelLarge" style={[styles.summaryText, { color: theme.colors.onSurfaceVariant }]}>
          {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} a menos de {formatRadius(filters.radius)}
          {filters.sortBy === 'cercania' ? ' · por cercanía' : ' · más recientes'}
        </Text>
        {activeFilters > 0 && (
          <Button compact icon="filter-remove-outline" onPress={clearFilters}>
            Quitar filtros
          </Button>
        )}
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AlertCard alert={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="filter-remove-outline"
            title="Sin resultados"
            message="Ninguna alerta coincide con los filtros elegidos."
            action={activeFilters > 0 ? { label: 'Quitar filtros', onPress: clearFilters } : undefined}
          />
        }
      />

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowFilters(false)}
          accessibilityLabel="Cerrar filtros"
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.elevation.level3, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHeader}>
              <Text variant="titleLarge">Filtros</Text>
              <IconButton
                icon="close"
                onPress={() => setShowFilters(false)}
                accessibilityLabel="Cerrar filtros"
              />
            </View>

            <Text variant="titleSmall" style={styles.label}>Fecha</Text>
            <SegmentedButtons
              value={filters.date}
              onValueChange={(v) => setFilters({ date: v as DateFilter })}
              buttons={[
                { value: 'hoy', label: 'Hoy' },
                { value: 'semana', label: '7 días' },
                { value: 'todo', label: 'Todas' },
              ]}
            />

            <Text variant="titleSmall" style={styles.label}>Cercanía</Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((r) => (
                <Chip
                  key={r}
                  selected={filters.radius === r}
                  showSelectedOverlay
                  onPress={() => setFilters({ radius: r })}
                >
                  {formatRadius(r)}
                </Chip>
              ))}
            </View>

            <Text variant="titleSmall" style={styles.label}>Ordenar por</Text>
            <SegmentedButtons
              value={filters.sortBy}
              onValueChange={(v) => setFilters({ sortBy: v as SortBy })}
              buttons={[
                { value: 'fecha', label: 'Fecha', icon: 'clock-outline' },
                { value: 'cercania', label: 'Cercanía', icon: 'map-marker-distance' },
              ]}
            />

            <Divider style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text variant="bodyLarge">Solo alertas validadas</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Confirmadas por al menos 3 vecinos
                </Text>
              </View>
              <Switch value={filters.onlyValidated} onValueChange={(v) => setFilters({ onlyValidated: v })} />
            </View>

            {remoteEnabled && (
              <View style={[styles.switchRow, styles.pushRow]}>
                <View style={styles.flex}>
                  <Text variant="bodyLarge">Avisarme de alertas cercanas</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Te notificamos las nuevas a menos de {formatRadius(filters.radius)}. Guardamos tu
                    zona aproximada (~100 m), nunca tu posición exacta.
                  </Text>
                </View>
                <Switch value={pushEnabled} onValueChange={togglePush} />
              </View>
            )}

            <View style={styles.actions}>
              <Button onPress={resetFilters}>Limpiar</Button>
              <Button mode="contained" onPress={() => setShowFilters(false)}>
                Ver {alerts.length} {alerts.length === 1 ? 'resultado' : 'resultados'}
              </Button>
            </View>

            {/* Indica con qué datos trabaja la app: útil para saber si las claves de Supabase llegaron. */}
            <Text variant="labelSmall" style={[styles.modeCaption, { color: theme.colors.onSurfaceVariant }]}>
              {remoteEnabled ? 'Conectado a Supabase' : 'Modo local: sin servidor, sin avisos'}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingBottom: 8 },
  summaryText: { flex: 1 },
  list: { paddingBottom: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '85%',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  // Margen negativo para que la X quede alineada con el borde derecho del contenido.
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -12 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  label: { marginTop: 16, marginBottom: 8 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { marginVertical: 16 },
  pushRow: { marginTop: 16 },
  modeCaption: { textAlign: 'center', marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
