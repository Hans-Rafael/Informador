import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Card, Text, useTheme } from 'react-native-paper';

import { EmptyState } from '@/components/empty-state';
import { timeAgo } from '@/lib/geo';
import { fetchLocalNews, placeFor, type NewsItem, type Place } from '@/lib/news';
import { useStore } from '@/lib/store';

export default function NoticiasScreen() {
  const theme = useTheme();
  const { location } = useStore();
  const [place, setPlace] = useState<Place | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const p = await placeFor(location);
      setPlace(p);
      setNews(p ? await fetchLocalNews(p) : []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [location.latitude.toFixed(2), location.longitude.toFixed(2)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const empty = loading ? null : failed ? (
    <EmptyState
      icon="wifi-off"
      title="No pudimos cargar las noticias"
      message="Revisá tu conexión e intentá de nuevo."
      action={{ label: 'Reintentar', onPress: load }}
    />
  ) : (
    <EmptyState
      icon="newspaper-variant-outline"
      title="Sin noticias locales"
      message={
        place
          ? `No encontramos noticias recientes de ${place.city}.`
          : 'No pudimos saber en qué ciudad estás. Activá la ubicación para ver noticias de tu zona.'
      }
      action={{ label: 'Actualizar', onPress: load }}
    />
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title={place ? `Noticias · ${place.city}` : "Noticias"} />
        <Appbar.Action icon="refresh" onPress={load} disabled={loading} accessibilityLabel="Actualizar" />
      </Appbar.Header>

      {loading && news.length === 0 ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={news}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={empty}
          ListFooterComponent={
            news.length > 0 ? (
              <Text variant="labelSmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
                Titulares de Google Noticias y Bing Noticias. Se abren en el sitio del medio.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Card mode="contained" onPress={() => WebBrowser.openBrowserAsync(item.url)}>
              <Card.Content style={styles.card}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  {item.source} · {timeAgo(item.publishedAt)}
                </Text>
                <Text variant="titleMedium">{item.title}</Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 48 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  card: { gap: 4 },
  footer: { textAlign: 'center', marginTop: 8 },
});
