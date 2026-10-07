import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

type Props = {
  icon: string;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, message, action }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Icon source={icon} size={48} color={theme.colors.outline} />
      <Text variant="titleMedium">{title}</Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>
      {action && (
        <Button mode="outlined" onPress={action.onPress} style={styles.action}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 32, gap: 8 },
  message: { textAlign: 'center' },
  action: { marginTop: 8 },
});
