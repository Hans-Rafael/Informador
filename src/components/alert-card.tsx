import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, Icon, Text, useTheme } from 'react-native-paper';

import { categoryTextColor, getCategory } from '@/lib/categories';
import { formatDistance, timeAgo } from '@/lib/geo';
import { isValidated, type AlertWithDistance } from '@/lib/store';

// Etiqueta compacta "Validada": nunca se parte ni se sale de la card.
function ValidatedBadge() {
  const theme = useTheme();
  return (
    <View style={[styles.validated, { backgroundColor: theme.colors.primaryContainer }]}>
      <Icon source="check-decagram" size={12} color={theme.colors.onPrimaryContainer} />
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={{ color: theme.colors.onPrimaryContainer }}
      >
        Validada
      </Text>
    </View>
  );
}

export function AlertCard({ alert }: { alert: AlertWithDistance }) {
  const theme = useTheme();
  const router = useRouter();
  const category = getCategory(alert.category);

  return (
    <Card
      mode="elevated"
      style={styles.card}
      onPress={() => router.push({ pathname: '/alerta/[id]', params: { id: alert.id } })}
    >
      <View style={styles.row}>
        {alert.imageUri ? (
          <Image source={{ uri: alert.imageUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <Avatar.Icon
            size={64}
            icon={category.icon}
            color="#FFFFFF"
            style={[styles.thumb, { backgroundColor: category.color }]}
          />
        )}
        <View style={styles.body}>
          <Text variant="labelMedium" style={{ color: categoryTextColor(alert.category, theme.dark) }}>
            {category.label.toUpperCase()}
          </Text>
          <Text variant="titleMedium" numberOfLines={1}>
            {alert.title}
          </Text>
          <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>
            {alert.description}
          </Text>
          <View style={styles.meta}>
            <Text
              variant="labelSmall"
              numberOfLines={1}
              style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}
            >
              {timeAgo(alert.createdAt)} · {formatDistance(alert.distance)}
            </Text>
            {isValidated(alert) && <ValidatedBadge />}
          </View>
        </View>
      </View>
    </Card>
  );
}

// Versión compacta para el carrusel horizontal de la home.
export function AlertMiniCard({ alert, width }: { alert: AlertWithDistance; width: number }) {
  const theme = useTheme();
  const router = useRouter();
  const category = getCategory(alert.category);

  return (
    <Card
      mode="elevated"
      style={{ width }}
      onPress={() => router.push({ pathname: '/alerta/[id]', params: { id: alert.id } })}
    >
      <View style={styles.miniBody}>
        <View style={styles.miniHeader}>
          <Avatar.Icon
            size={36}
            icon={category.icon}
            color="#FFFFFF"
            style={{ backgroundColor: category.color }}
          />
          <Text
            variant="labelMedium"
            numberOfLines={1}
            style={[styles.flex, { color: categoryTextColor(alert.category, theme.dark) }]}
          >
            {category.label.toUpperCase()}
          </Text>
          {isValidated(alert) && <ValidatedBadge />}
        </View>
        <Text variant="titleMedium" numberOfLines={1}>
          {alert.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>
          {alert.description}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {timeAgo(alert.createdAt)} · {formatDistance(alert.distance)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  miniBody: { padding: 12, gap: 6 },
  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { marginHorizontal: 16, marginBottom: 12 },
  row: { flexDirection: 'row', padding: 12, gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  validated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
