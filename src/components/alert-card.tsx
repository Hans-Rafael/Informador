import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, Icon, Text, useTheme } from 'react-native-paper';

import { categoryTextColor, getCategory } from '@/lib/categories';
import { formatDistance, timeAgo } from '@/lib/geo';
import { isDemo, isValidated, type AlertWithDistance } from '@/lib/store';

// Con foto, la miniatura es más grande para que se pueda escanear la lista de un vistazo.
const THUMB_ICON = 64;
const THUMB_WITH_IMAGE = 88;

export function AlertCard({ alert }: { alert: AlertWithDistance }) {
  const theme = useTheme();
  const router = useRouter();
  const category = getCategory(alert.category);
  const thumbSize = alert.imageUri ? THUMB_WITH_IMAGE : THUMB_ICON;

  return (
    <Card
      mode="elevated"
      style={styles.card}
      onPress={() => router.push({ pathname: '/alerta/[id]', params: { id: alert.id } })}
    >
      <View style={styles.row}>
        {alert.imageUri ? (
          <Image
            source={{ uri: alert.imageUri }}
            style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
            contentFit="cover"
          />
        ) : (
          <Avatar.Icon
            size={thumbSize}
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
          <Text variant="labelSmall" numberOfLines={1} style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
            {timeAgo(alert.createdAt)} · {formatDistance(alert.distance)}
          </Text>
          {(isValidated(alert) || isDemo(alert)) && (
            <View style={styles.badges}>
              {isValidated(alert) && (
                <View style={styles.badge}>
                  <Icon source="check-decagram" size={14} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    Validada
                  </Text>
                </View>
              )}
              {isDemo(alert) && (
                <View style={styles.badge}>
                  <Icon source="flask-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Ejemplo
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12 },
  row: { flexDirection: 'row', padding: 12, gap: 12 },
  thumb: { borderRadius: 12 },
  // minWidth: 0 deja que el texto se encoja dentro del flex en lugar de desbordar la tarjeta.
  body: { flex: 1, minWidth: 0, gap: 2 },
  meta: { marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
