import { useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

import { CATEGORIES } from '@/lib/categories';
import type { CategoryId } from '@/lib/types';

type Props = {
  selected: CategoryId[];
  onToggle: (id: CategoryId) => void;
};

/**
 * Fila de chips de categoría que se desliza en horizontal. Debajo van unos puntos que
 * indican en qué parte del carrusel estás, para que se note que hay más chips fuera de pantalla.
 */
export function CategoryChips({ selected, onToggle }: Props) {
  const theme = useTheme();
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);

  // Una "página" es un ancho de pantalla de chips.
  const pages = viewport > 0 ? Math.max(1, Math.ceil(content / viewport)) : 1;
  const maxOffset = Math.max(content - viewport, 1);
  const active = Math.min(pages - 1, Math.round((offset / maxOffset) * (pages - 1)));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(e.nativeEvent.contentOffset.x);

  return (
    <View>
      {/* flexGrow/flexShrink en 0: el ScrollView no debe estirarse ni aplastarse con el alto libre. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.chips}
        onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            icon={c.icon}
            selected={selected.includes(c.id)}
            showSelectedOverlay
            onPress={() => onToggle(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </ScrollView>

      {pages > 1 && (
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Categorías, página ${active + 1} de ${pages}`}
        >
          {Array.from({ length: pages }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === active
                  ? { width: 20, backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.outlineVariant },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
