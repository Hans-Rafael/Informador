# InfoBarrio (Informador)

> Las noticias a tu alrededor. Contribuí o recibilas.

App móvil (Expo SDK 57 + Expo Router) basada en el estudio UX `Diseño UX-Informador`.
La interfaz usa **Material Design 3** mediante [React Native Paper](https://callstack.github.io/react-native-paper/).

## Ejecutar

El mapa usa **MapLibre + OpenStreetMap** (gratis, sin API key). Al ser código nativo,
**la app ya no corre en Expo Go**: hace falta un *development build* en el teléfono.

```bash
npm install
npm run dev-apk     # una sola vez: compila en la nube (EAS) un APK de desarrollo; instalalo en el teléfono
npx expo start      # luego abrí la app instalada y escaneá el QR
npm run web         # alternativa rápida en el navegador (mapa con Leaflet)
```

Si tenés Android Studio, `npm run android` compila e instala el build en el teléfono o emulador.

## Estructura (según el mapa del sitio del estudio UX)

| Pestaña | Archivo | Qué incluye |
| --- | --- | --- |
| Inicio | `src/app/(tabs)/index.tsx` | Mapa con geolocalización, alertas en el mapa, "En esta zona", radio ajustable |
| Alertas | `src/app/(tabs)/alertas.tsx` | Lista + **Filtros** (categoría, fecha, cercanía, solo validadas, orden) |
| Mis sitios | `src/app/(tabs)/mis-sitios.tsx` | Casa, trabajo y sitios de interés con sus alertas cercanas |
| Compartir | `src/app/(tabs)/compartir.tsx` | Editor de noticias: categoría, texto, imagen, ubicación |
| Detalle | `src/app/alerta/[id].tsx` | Validar noticia, valoración del informante, reportar contenido, compartir |

- `src/lib/store.tsx`: estado global, ubicación y persistencia local (AsyncStorage).
- `src/lib/theme.ts`: tema Material 3 claro/oscuro con el color de marca.
- `src/components/alert-map.tsx`: mapa móvil (`@maplibre/maplibre-react-native` + OpenStreetMap); `alert-map.web.tsx` es el equivalente para web (Leaflet).

## Estado del MVP

| Funcionalidad imprescindible | Estado |
| --- | --- |
| Editor de noticias | ✅ |
| Mapa con geolocalización | ✅ |
| Alertas en el mapa (color por categoría) | ✅ |
| Selección de categoría | ✅ |
| Filtrado por cercanía o fecha | ✅ |
| Validación de noticias | ✅ (local) |
| Moderación y reporte de contenido | ✅ (local, se oculta con 3 reportes) |
| Mis sitios | ✅ |
| Notificaciones en tiempo real | ⏳ requiere backend |

Los datos se guardan solo en el teléfono. Para compartir alertas entre usuarios y enviar
notificaciones hace falta un backend (por ejemplo Supabase o Firebase).

## Generar la APK (EAS Build)

```bash
eas login            # cuenta gratis en expo.dev
npm run apk          # genera el .apk final en la nube
```

Al terminar, EAS da un link y un QR para descargar la APK. No se necesita ninguna key de mapas.
