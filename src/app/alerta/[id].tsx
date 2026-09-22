import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  Icon,
  Portal,
  ProgressBar,
  RadioButton,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { AlertMap } from '@/components/alert-map';
import { EmptyState } from '@/components/empty-state';
import { categoryTextColor, getCategory, HIDDEN_REPORTS_THRESHOLD, REPORT_REASONS, VALIDATED_THRESHOLD } from '@/lib/categories';
import { distanceMeters, formatDistance, timeAgo } from '@/lib/geo';
import { isValidated, useStore } from '@/lib/store';

export default function AlertaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { alerts, location, validatedIds, reportedIds, validateAlert, reportAlert } = useStore();
  const alert = alerts.find((a) => a.id === id);

  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [message, setMessage] = useState('');

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!alert || alert.reports >= HIDDEN_REPORTS_THRESHOLD) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={back} />
          <Appbar.Content title="Alerta" />
        </Appbar.Header>
        <EmptyState
          icon="eye-off-outline"
          title="Alerta no disponible"
          message="Esta alerta fue eliminada o está en revisión por reportes de la comunidad."
        />
      </View>
    );
  }

  const category = getCategory(alert.category);
  const validated = validatedIds.includes(alert.id);
  const reported = reportedIds.includes(alert.id);

  const share = () =>
    Share.share({
      message: `${category.label}: ${alert.title}\n\n${alert.description}\n\nCompartido desde InfoBarrio`,
    });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={back} />
        <Appbar.Content title={category.label} />
        <Appbar.Action icon="share-variant" onPress={share} accessibilityLabel="Compartir" />
        <Appbar.Action
          icon="flag-outline"
          disabled={reported || alert.mine}
          onPress={() => setReportOpen(true)}
          accessibilityLabel="Reportar contenido"
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.map}>
          <AlertMap center={alert.coords} radius={200} alerts={[alert]} />
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <Chip icon={category.icon} compact textStyle={{ color: categoryTextColor(alert.category, theme.dark) }}>
              {category.label}
            </Chip>
            {isValidated(alert) && (
              <Chip icon="check-decagram" compact>
                Validada
              </Chip>
            )}
          </View>

          <Text variant="headlineSmall">{alert.title}</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {timeAgo(alert.createdAt)} · a {formatDistance(distanceMeters(location, alert.coords))} de vos
          </Text>

          {alert.imageUri && <Image source={{ uri: alert.imageUri }} style={styles.image} contentFit="cover" />}

          <Text variant="bodyLarge">{alert.description}</Text>

          {/* Ver valoración de la información */}
          <Card mode="outlined">
            <Card.Title
              title={alert.author.name}
              subtitle={`${alert.author.contributions} aportes a la comunidad`}
              left={(props) => <Avatar.Text {...props} label={alert.author.name.slice(0, 1)} />}
              right={() => (
                <View style={[styles.row, styles.rating]}>
                  <Icon source="star" size={18} color="#F9A825" />
                  <Text variant="titleMedium">{alert.author.rating.toFixed(1)}</Text>
                </View>
              )}
            />
            <Card.Content style={styles.validation}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <Icon source="eye-check-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium">
                    {alert.validations} {alert.validations === 1 ? 'vecino confirmó' : 'vecinos confirmaron'}
                  </Text>
                </View>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {Math.min(alert.validations, VALIDATED_THRESHOLD)}/{VALIDATED_THRESHOLD}
                </Text>
              </View>
              <ProgressBar progress={Math.min(alert.validations / VALIDATED_THRESHOLD, 1)} style={styles.progress} />
            </Card.Content>
          </Card>

          {!alert.mine && (
            <Button
              mode={validated ? 'contained-tonal' : 'contained'}
              icon={validated ? 'check-circle' : 'check-circle-outline'}
              disabled={validated}
              onPress={() => {
                validateAlert(alert.id);
                setMessage('¡Gracias! Confirmaste esta noticia.');
              }}
              contentStyle={styles.buttonContent}
            >
              {validated ? 'Ya validaste esta noticia' : 'Validar: yo también lo vi'}
            </Button>
          )}
          {alert.mine && (
            <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
              Publicaste esta noticia. Tus vecinos pueden validarla.
            </Text>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={reportOpen} onDismiss={() => setReportOpen(false)}>
          <Dialog.Icon icon="flag" />
          <Dialog.Title style={styles.center}>Reportar contenido</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <RadioButton.Item key={r} label={r} value={r} style={styles.radio} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReportOpen(false)}>Cancelar</Button>
            <Button
              onPress={() => {
                reportAlert(alert.id);
                setReportOpen(false);
                setMessage('Reporte enviado. La comunidad revisará esta alerta.');
              }}
            >
              Reportar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>
        {message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
  map: { height: 200, overflow: 'hidden' },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rating: { marginRight: 16, gap: 4 },
  image: { width: '100%', height: 220, borderRadius: 16 },
  validation: { gap: 8, paddingBottom: 16 },
  progress: { borderRadius: 4, height: 6 },
  buttonContent: { paddingVertical: 6 },
  center: { textAlign: 'center' },
  radio: { paddingHorizontal: 0 },
});
