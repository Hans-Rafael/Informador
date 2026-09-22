import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Chip,
  HelperText,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { AlertMap } from '@/components/alert-map';
import { CATEGORIES } from '@/lib/categories';
import { useStore } from '@/lib/store';
import type { CategoryId, Coords } from '@/lib/types';

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 400;

export default function CompartirScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { location, publishAlert } = useStore();

  const [category, setCategory] = useState<CategoryId | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string>();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const errors = {
    category: !category,
    title: title.trim().length < 5,
    description: description.trim().length < 10,
  };
  const valid = !errors.category && !errors.title && !errors.description;

  async function pickImage(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  function publish() {
    setSubmitted(true);
    if (!valid || !category) return;
    const alert = publishAlert({
      category,
      title: title.trim(),
      description: description.trim(),
      imageUri,
      coords: coords ?? location,
    });
    setCategory(null);
    setTitle('');
    setDescription('');
    setImageUri(undefined);
    setCoords(null);
    setSubmitted(false);
    router.push({ pathname: '/alerta/[id]', params: { id: alert.id } });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Appbar.Header elevated>
        <Appbar.Content title="Compartir mi noticia" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Contale a tus vecinos qué está pasando. Aportá información verídica: la comunidad la
          valida.
        </Text>

        <Text variant="titleSmall">1. Tipo de noticia</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              icon={c.icon}
              mode={category === c.id ? 'flat' : 'outlined'}
              selected={category === c.id}
              showSelectedOverlay
              onPress={() => setCategory(c.id)}
            >
              {c.label}
            </Chip>
          ))}
        </View>
        <HelperText type="error" visible={submitted && errors.category}>
          Elegí una categoría.
        </HelperText>

        <Text variant="titleSmall">2. ¿Qué está pasando?</Text>
        <TextInput
          mode="outlined"
          label="Título"
          placeholder="Ej: Semáforo roto, Feria vecinal…"
          value={title}
          onChangeText={setTitle}
          maxLength={TITLE_MAX}
          error={submitted && errors.title}
          right={<TextInput.Affix text={`${title.length}/${TITLE_MAX}`} />}
        />
        <HelperText type="error" visible={submitted && errors.title}>
          El título debe tener al menos 5 caracteres.
        </HelperText>
        <TextInput
          mode="outlined"
          label="Detalles"
          placeholder="Dónde, cuándo y todo lo que ayude a tus vecinos."
          value={description}
          onChangeText={setDescription}
          maxLength={DESCRIPTION_MAX}
          multiline
          numberOfLines={5}
          style={styles.textarea}
          error={submitted && errors.description}
        />
        <HelperText type={submitted && errors.description ? 'error' : 'info'} visible>
          {submitted && errors.description
            ? 'Agregá un poco más de detalle (mínimo 10 caracteres).'
            : `${description.length}/${DESCRIPTION_MAX}`}
        </HelperText>

        <Text variant="titleSmall">3. Imagen (opcional)</Text>
        {imageUri ? (
          <View>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            <IconButton
              icon="close"
              mode="contained"
              style={styles.removeImage}
              onPress={() => setImageUri(undefined)}
              accessibilityLabel="Quitar imagen"
            />
          </View>
        ) : (
          <View style={styles.row}>
            <Button mode="outlined" icon="camera" onPress={() => pickImage(true)} style={styles.flex}>
              Cámara
            </Button>
            <Button mode="outlined" icon="image" onPress={() => pickImage(false)} style={styles.flex}>
              Galería
            </Button>
          </View>
        )}

        <Text variant="titleSmall" style={styles.section}>4. Ubicación</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {coords ? 'Ubicación elegida en el mapa.' : 'Usamos tu ubicación actual. Tocá el mapa para cambiarla.'}
        </Text>
        <View style={[styles.map, { borderColor: theme.colors.outlineVariant }]}>
          <AlertMap center={location} radius={250} picked={coords ?? location} onPick={setCoords} />
        </View>

        <Button mode="contained" icon="send" onPress={publish} style={styles.publish} contentStyle={styles.publishContent}>
          Publicar
        </Button>
      </ScrollView>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>
        {message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textarea: { minHeight: 120 },
  row: { flexDirection: 'row', gap: 12 },
  preview: { width: '100%', height: 200, borderRadius: 16 },
  removeImage: { position: 'absolute', top: 4, right: 4 },
  section: { marginTop: 16 },
  map: { height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  publish: { marginTop: 16 },
  publishContent: { paddingVertical: 6 },
});
