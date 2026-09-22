import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Card, FAB, IconButton, List, Text, useTheme } from 'react-native-paper';

import { AlertCard } from '@/components/alert-card';
import { EmptyState } from '@/components/empty-state';
import { SITE_TYPES } from '@/lib/categories';
import { formatDistance } from '@/lib/geo';
import { useAlertsNear, useStore } from '@/lib/store';
import type { Site, SiteType } from '@/lib/types';

function SiteItem({ site, expanded, onToggle }: { site: Site; expanded: boolean; onToggle: () => void }) {
  const theme = useTheme();
  const { filters, removeSite } = useStore();
  const alerts = useAlertsNear(site.coords, filters.radius);

  return (
    <Card mode="contained" style={styles.card}>
      <List.Item
        title={site.name}
        description={`${SITE_TYPES[site.type].label} · ${alerts.length} alertas a menos de ${formatDistance(filters.radius)}`}
        left={(props) => <List.Icon {...props} icon={SITE_TYPES[site.type].icon} color={theme.colors.primary} />}
        right={() => (
          <View style={styles.row}>
            <IconButton icon="delete-outline" onPress={() => removeSite(site.id)} accessibilityLabel="Eliminar sitio" />
            <List.Icon icon={expanded ? 'chevron-up' : 'chevron-down'} />
          </View>
        )}
        onPress={onToggle}
      />
      {expanded && (
        <View style={styles.alerts}>
          {alerts.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.none, { color: theme.colors.onSurfaceVariant }]}>
              No hay alertas cerca de este sitio.
            </Text>
          ) : (
            alerts.map((a) => <AlertCard key={a.id} alert={a} />)
          )}
        </View>
      )}
    </Card>
  );
}

export default function MisSitiosScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { sites } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  const missing = (['casa', 'trabajo'] as SiteType[]).filter((t) => !sites.some((s) => s.type === t));
  const add = (type: SiteType) => router.push({ pathname: '/sitio-nuevo', params: { type } });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Mis sitios" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Guardá los lugares que te importan y enterate de lo que pasa cerca de ellos.
        </Text>

        {missing.map((type) => (
          <Card key={type} mode="outlined" style={styles.card} onPress={() => add(type)}>
            <List.Item
              title={`Agregar ${SITE_TYPES[type].label.toLowerCase()}`}
              left={(props) => <List.Icon {...props} icon={SITE_TYPES[type].icon} />}
              right={(props) => <List.Icon {...props} icon="plus" />}
            />
          </Card>
        ))}

        {sites.map((site) => (
          <SiteItem
            key={site.id}
            site={site}
            expanded={expanded === site.id}
            onToggle={() => setExpanded(expanded === site.id ? null : site.id)}
          />
        ))}

        {sites.length === 0 && (
          <EmptyState
            icon="map-marker-star-outline"
            title="Todavía no tenés sitios"
            message="Agregá tu casa, tu trabajo o cualquier lugar de interés."
          />
        )}
      </ScrollView>

      <FAB icon="map-marker-plus" label="Agregar sitio" style={styles.fab} onPress={() => add('interes')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: 8, paddingBottom: 96 },
  intro: { paddingHorizontal: 16, paddingBottom: 8 },
  card: { marginHorizontal: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  alerts: { paddingBottom: 4 },
  none: { paddingHorizontal: 16, paddingBottom: 16 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
