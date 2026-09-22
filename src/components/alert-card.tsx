import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, Icon, Text, useTheme } from 'react-native-paper';

import { categoryTextColor, getCategory } from '@/lib/categories';
import { formatDistance, timeAgo } from '@/lib/geo';
import { isValidated, type AlertWithDistance } from '@/lib/store';

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
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {timeAgo(alert.createdAt)} · {formatDistance(alert.distance)}
            </Text>
            {isValidated(alert) && (
              <View style={styles.validated}>
                <Icon source="check-decagram" size={14} color={theme.colors.primary} />
                <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                  Validada
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12 },
  row: { flexDirection: 'row', padding: 12, gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  validated: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
