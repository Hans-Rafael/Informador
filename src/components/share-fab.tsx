import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';

/**
 * Botón para compartir una noticia: la acción principal de la app.
 * Con `bottom` flota fijo en la esquina; sin él se coloca donde lo pongas (p. ej. en una hoja).
 */
export function ShareFab({ bottom }: { bottom?: number }) {
  const router = useRouter();
  return (
    <FAB
      icon="plus"
      label="Compartir"
      style={bottom === undefined ? undefined : [styles.floating, { bottom }]}
      onPress={() => router.push('/compartir')}
      accessibilityLabel="Compartir una noticia"
    />
  );
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', right: 16 },
});
