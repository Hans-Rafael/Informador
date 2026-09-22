import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertMap } from '@/components/alert-map';
import { SITE_TYPES } from '@/lib/categories';
import { useStore } from '@/lib/store';
import type { Coords, SiteType } from '@/lib/types';

export default function SitioNuevoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: SiteType }>();
  const { location, addSite } = useStore();

  const [type, setType] = useState<SiteType>(params.type ?? 'interes');
  const [name, setName] = useState(params.type && params.type !== 'interes' ? SITE_TYPES[params.type].label : '');
  const [coords, setCoords] = useState<Coords>(location);

  const save = () => {
    addSite({ type, name: name.trim() || SITE_TYPES[type].label, coords });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Appbar.Header>
        <Appbar.Action icon="close" onPress={() => router.back()} accessibilityLabel="Cerrar" />
        <Appbar.Content title="Nuevo sitio" />
      </Appbar.Header>

      <View style={styles.map}>
        <AlertMap center={location} radius={300} picked={coords} onPick={setCoords} />
      </View>
      <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Tocá el mapa o arrastrá el pin para elegir la ubicación.
      </Text>

      <View style={[styles.form, { paddingBottom: insets.bottom + 16 }]}>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as SiteType)}
          buttons={(Object.keys(SITE_TYPES) as SiteType[]).map((t) => ({
            value: t,
            label: t === 'interes' ? 'Interés' : SITE_TYPES[t].label,
            icon: SITE_TYPES[t].icon,
          }))}
        />
        <TextInput
          mode="outlined"
          label="Nombre"
          placeholder="Ej: Casa de mamá, Gimnasio…"
          value={name}
          onChangeText={setName}
          maxLength={40}
        />
        <Button mode="contained" icon="content-save" onPress={save}>
          Guardar sitio
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  map: { flex: 1, overflow: 'hidden' },
  hint: { paddingHorizontal: 16, paddingTop: 8 },
  form: { padding: 16, gap: 16 },
});
