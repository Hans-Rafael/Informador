# InfoBarrio (Informador)

> Las noticias a tu alrededor. Contribuí o recibilas.

App móvil (Expo SDK 57 + Expo Router) basada en el estudio UX `Diseño UX-Informador`.
La interfaz usa **Material Design 3** mediante [React Native Paper](https://callstack.github.io/react-native-paper/).

## Ejecutar

```bash
npm install
npx expo start      # escanear el QR con Expo Go
```

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
- `src/components/alert-map.tsx`: mapa (`react-native-maps`); `alert-map.web.tsx` es el reemplazo para web.

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

1. Pegá tu key de Google Maps en `.env.local` (en la raíz del proyecto; no se sube a GitHub).
2. Ejecutá:

```bash
eas login            # cuenta gratis en expo.dev
npm run subir-key    # guarda la key de .env.local como variable secreta en EAS
npm run apk          # genera el .apk en la nube
```

Al terminar, EAS da un link y un QR para descargar la APK. `GOOGLE_MAPS_API_KEY` es
obligatoria: sin ella la app se cierra al abrir una pantalla con mapa. La key se crea en
Google Cloud Console habilitando "Maps SDK for Android".
