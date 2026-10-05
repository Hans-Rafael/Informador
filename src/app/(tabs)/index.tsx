import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Badge, Banner, Button, Chip, FAB, IconButton, Menu, Text, useTheme } from 'react-native-paper';

import { AlertMiniCard, MINI_CARD_WIDTH } from '@/components/alert-card';
import { AlertMap } from '@/components/alert-map';
import { EmptyState } from '@/components/empty-state';
import { CATEGORIES, RADIUS_OPTIONS } from '@/lib/categories';
import { formatDistance } from '@/lib/geo';
import { useAlertsNear, useStore } from '@/lib/store';
import type { CategoryId } from '@/lib/types';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { location, locationGranted, filters, setFilters, refreshLocation } = useStore();
  const nearby = useAlertsNear(location, filters.radius);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const alerts = category ? nearby.filter((a) => a.category === category) : nearby;
  const [radiusMenu, setRadiusMenu] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header mode="small" elevated>
        <Appbar.Content
          title="InfoBarrio"
          titleStyle={{ color: theme.colors.primary, fontWeight: '700' }}
        />
        <Menu
          visible={radiusMenu}
          onDismiss={() => setRadiusMenu(false)}
          anchor={
            <Button icon="radius-outline" compact onPress={() => setRadiusMenu(true)}>
              {formatDistance(filters.radius)}
            </Button>
          }
        >
          {RADIUS_OPTIONS.map((r) => (
            <Menu.Item
              key={r}
              title={`Radio de ${formatDistance(r)}`}
              leadingIcon={r === filters.radius ? 'check' : undefined}
              onPress={() => {
                setFilters({ radius: r });
                setRadiusMenu(false);
              }}
            />
          ))}
        </Menu>
      </Appbar.Header>

      <Banner
        visible={!locationGranted && !bannerDismissed}
        icon="map-marker-off"
        actions={[
          { label: 'Ahora no', onPress: () => setBannerDismissed(true) },
          { label: 'Activar ubicación', onPress: refreshLocation },
        ]}
      >
        Activá tu ubicación para ver lo que pasa a la vuelta de tu esquina. Mientras tanto
        mostramos Palermo.
      </Banner>

      <View style={styles.map}>
        <AlertMap
          center={location}
          radius={filters.radius}
          alerts={alerts}
          onOpenAlert={(a) => router.push({ pathname: '/alerta/[id]', params: { id: a.id } })}
        />
        <IconButton
          icon="crosshairs-gps"
          mode="contained-tonal"
          style={styles.locate}
          onPress={refreshLocation}
          accessibilityLabel="Centrar en mi ubicación"
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">En esta zona</Text>
        <Badge size={28} style={{ backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer }}>
          {alerts.length}
        </Badge>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        <Chip selected={category === null} showSelectedOverlay onPress={() => setCategory(null)}>
          Todas ({nearby.length})
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            icon={c.icon}
            selected={category === c.id}
            showSelectedOverlay
            onPress={() => setCategory(category === c.id ? null : c.id)}
          >
            {c.label} ({nearby.filter((a) => a.category === c.id).length})
          </Chip>
        ))}
      </ScrollView>

      {alerts.length === 0 ? (
        <EmptyState
          icon="map-search-outline"
          title="Todo tranquilo por acá"
          message="No hay alertas en esta categoría y radio. Ampliá el radio o compartí lo que está pasando."
        />
      ) : (
        <FlatList
          horizontal
          data={alerts}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AlertMiniCard alert={item} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={MINI_CARD_WIDTH + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.carousel}
          style={styles.carouselScroll}
        />
      )}

      <FAB
        icon="plus"
        label="Compartir"
        style={styles.fab}
        onPress={() => router.push('/compartir')}
        accessibilityLabel="Compartir una información rápidamente"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  map: { height: '40%', overflow: 'hidden' },
  locate: { position: 'absolute', right: 8, bottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipsScroll: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  carouselScroll: { flexGrow: 0 },
  carousel: { gap: 12, paddingHorizontal: 16, paddingBottom: 88 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
