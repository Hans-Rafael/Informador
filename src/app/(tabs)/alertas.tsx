import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Chip,
  Divider,
  SegmentedButtons,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCard } from '@/components/alert-card';
import { EmptyState } from '@/components/empty-state';
import { ShareFab } from '@/components/share-fab';
import { CATEGORIES, RADIUS_OPTIONS } from '@/lib/categories';
import { formatDistance } from '@/lib/geo';
import { useAlertsNear, useStore } from '@/lib/store';
import type { CategoryId, DateFilter, SortBy } from '@/lib/types';

export default function AlertasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { location, filters, setFilters, resetFilters } = useStore();
  const alerts = useAlertsNear(location, filters.radius, true);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters =
    filters.categories.length + (filters.date !== 'todo' ? 1 : 0) + (filters.onlyValidated ? 1 : 0);

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            icon={c.icon}
            selected={filters.categories.includes(c.id)}
            showSelectedOverlay
            onPress={() => toggleCategory(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </ScrollView>

      <Text variant="labelLarge" style={[styles.summary, { color: theme.colors.onSurfaceVariant }]}>
        {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} a menos de {formatDistance(filters.radius)}
        {filters.sortBy === 'cercania' ? ' · por cercanía' : ' · más recientes'}
      </Text>

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
          />
        }
      />

      <ShareFab bottom={16} />

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
            <Text variant="titleLarge">Filtros</Text>

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
            <SegmentedButtons
              value={String(filters.radius)}
              onValueChange={(v) => setFilters({ radius: Number(v) })}
              buttons={RADIUS_OPTIONS.map((r) => ({ value: String(r), label: formatDistance(r) }))}
            />

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

            <View style={styles.actions}>
              <Button onPress={resetFilters}>Limpiar</Button>
              <Button mode="contained" onPress={() => setShowFilters(false)}>
                Ver {alerts.length} resultados
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  summary: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { paddingBottom: 96 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '85%',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  label: { marginTop: 16, marginBottom: 8 },
  divider: { marginVertical: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
