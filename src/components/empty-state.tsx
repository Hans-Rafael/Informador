import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

export function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Icon source={icon} size={48} color={theme.colors.outline} />
      <Text variant="titleMedium">{title}</Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 32, gap: 8 },
  message: { textAlign: 'center' },
});
