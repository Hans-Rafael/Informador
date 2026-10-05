import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

export type SheetSnap = 'peek' | 'half' | 'full';

const PEEK = 128; // altura visible plegada: asa + encabezado
const ACCESSORY = 56; // zona transparente sobre la hoja para botones flotantes

type Props = {
  /** Alto del área disponible (el mapa). */
  height: number;
  /** Zona de arrastre siempre visible: asa + encabezado. */
  header: ReactNode;
  /** Botones flotantes que acompañan a la hoja (esquina superior derecha). */
  accessory?: ReactNode;
  /** El contenido recibe si la hoja está desplegada del todo (para activar su scroll). */
  children: (expanded: boolean) => ReactNode;
};

// Hoja inferior arrastrable con tres posiciones. Solo se arrastra desde el encabezado,
// así la lista de adentro conserva su propio scroll.
export function BottomSheet({ height, header, accessory, children }: Props) {
  const theme = useTheme();
  const full = Math.max(height - ACCESSORY, PEEK);
  const stops = useMemo(
    () => ({ peek: full - PEEK, half: full - Math.max(height * 0.5, PEEK), full: 0 }),
    [full, height],
  );

  const [snap, setSnap] = useState<SheetSnap>('half');
  const y = useRef(new Animated.Value(stops.half)).current;
  const current = useRef(stops.half);
  const start = useRef(0);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  useEffect(() => {
    const id = y.addListener(({ value }) => (current.current = value));
    return () => y.removeListener(id);
  }, [y]);

  const goTo = (target: SheetSnap) => {
    setSnap(target);
    Animated.spring(y, { toValue: stopsRef.current[target], useNativeDriver: true, bounciness: 0 }).start();
  };

  // Si cambia el alto disponible, recolocamos la hoja en su posición actual.
  useEffect(() => {
    y.setValue(stops[snap]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          y.stopAnimation();
          start.current = current.current;
        },
        onPanResponderMove: (_, g) => {
          const s = stopsRef.current;
          y.setValue(Math.min(Math.max(start.current + g.dy, s.full), s.peek));
        },
        onPanResponderRelease: (_, g) => {
          const s = stopsRef.current;
          // Proyectamos con la velocidad para que un gesto rápido salte al siguiente punto.
          const projected = current.current + g.vy * 120;
          const nearest = (Object.keys(s) as SheetSnap[]).reduce((a, b) =>
            Math.abs(s[a] - projected) <= Math.abs(s[b] - projected) ? a : b,
          );
          goTo(nearest);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [y],
  );

  if (height <= 0) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { height: full + ACCESSORY, transform: [{ translateY: y }] }]}
    >
      <View style={styles.accessory} pointerEvents="box-none">
        {accessory}
      </View>
      <View style={[styles.sheet, { backgroundColor: theme.colors.elevation.level1 }]}>
        <View {...pan.panHandlers} style={styles.header} accessibilityLabel="Arrastrar para ver más">
          <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]} />
          {header}
        </View>
        <View style={styles.flex}>{children(snap === 'full')}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { position: 'absolute', left: 0, right: 0, top: 0 },
  accessory: { height: ACCESSORY, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 12 },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  header: { paddingBottom: 4 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 10, marginBottom: 4 },
});
