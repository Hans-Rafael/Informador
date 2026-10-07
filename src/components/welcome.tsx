import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';
import { remoteEnabled } from '@/lib/supabase';

const POINTS = [
  { icon: 'map-marker-radius', text: 'Mirá qué está pasando a la vuelta de tu esquina.' },
  { icon: 'share-variant', text: 'Contale a tus vecinos lo que ves, en pocos toques.' },
  { icon: 'check-decagram', text: 'Validá las noticias para que la comunidad pueda confiar.' },
];

/** Pantalla de primer uso: explica la app y para qué se pide la ubicación, antes del aviso del sistema. */
export function Welcome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useStore();
  const [busy, setBusy] = useState(false);

  const finish = async (askLocation: boolean) => {
    setBusy(true);
    await completeOnboarding(askLocation);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source="map-marker-radius" size={56} color={theme.colors.primary} />
        </View>
        <Text variant="headlineLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          InfoBarrio
        </Text>
        <Text variant="titleMedium" style={styles.tagline}>
          Tu ciudad, tu noticia.
        </Text>

        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.icon} style={styles.point}>
              <Icon source={p.icon} size={28} color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.pointText}>
                {p.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.why, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="crosshairs-gps" size={22} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={[styles.pointText, { color: theme.colors.onSurfaceVariant }]}>
            Usamos tu ubicación para mostrarte las alertas cercanas y ubicar lo que compartas.
            {remoteEnabled
              ? ' También te avisamos cuando haya algo nuevo cerca: guardamos solo tu zona aproximada, nunca tu posición exacta.'
              : ' Podés cambiar el radio cuando quieras.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button mode="contained" icon="map-marker-check" loading={busy} disabled={busy} onPress={() => finish(true)}>
          Activar ubicación
        </Button>
        <Button disabled={busy} onPress={() => finish(false)}>
          Ahora no, usar Palermo
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 48, alignItems: 'center', gap: 8 },
  logo: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tagline: { opacity: 0.8 },
  points: { alignSelf: 'stretch', gap: 20, marginTop: 32 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pointText: { flex: 1 },
  why: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginTop: 32 },
  actions: { paddingHorizontal: 24, gap: 4 },
});
