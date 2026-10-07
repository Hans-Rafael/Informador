import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Badge, Banner, Button, IconButton, Menu, Text, useTheme } from 'react-native-paper';

import { BottomSheet } from '@/components/bottom-sheet';
import { AlertCarousel } from '@/components/alert-carousel';
import { AlertMap } from '@/components/alert-map';
import { EmptyState } from '@/components/empty-state';
import { RADIUS_OPTIONS } from '@/lib/categories';
import { formatRadius } from '@/lib/geo';
import { useAlertsNear, useStore } from '@/lib/store';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { location, locationGranted, locating, filters, setFilters, refreshLocation } = useStore();
  const alerts = useAlertsNear(location, filters.radius);
  const [radiusMenu, setRadiusMenu] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [areaHeight, setAreaHeight] = useState(0);

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
              {formatRadius(filters.radius)}
            </Button>
          }
        >
          {RADIUS_OPTIONS.map((r) => (
            <Menu.Item
              key={r}
              title={`Radio de ${formatRadius(r)}`}
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

      <View style={styles.map} onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        <AlertMap
          center={location}
          radius={filters.radius}
          alerts={alerts}
          onOpenAlert={(a) => router.push({ pathname: '/alerta/[id]', params: { id: a.id } })}
        />
        <BottomSheet
          height={areaHeight}
          accessory={
            <View style={styles.accessory}>
              <IconButton
                icon="crosshairs-gps"
                mode="contained-tonal"
                loading={locating}
                disabled={locating}
                onPress={refreshLocation}
                accessibilityLabel="Centrar en mi ubicación"
              />
            </View>
          }
          header={
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium">En esta zona</Text>
              <Badge
                size={28}
                style={{ backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer }}
              >
                {alerts.length}
              </Badge>
            </View>
          }
        >
          {() =>
            alerts.length === 0 ? (
              <EmptyState
                icon="map-search-outline"
                title="Todo tranquilo por acá"
                message="No hay alertas en tu radio. Ampliá el radio o compartí lo que está pasando."
              />
            ) : (
              <AlertCarousel alerts={alerts} />
            )
          }
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  map: { flex: 1, overflow: 'hidden' },
  accessory: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
