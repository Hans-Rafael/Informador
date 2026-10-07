# InfoBarrio (Informador)

> Las noticias a tu alrededor. Contribuí o recibilas.

App móvil (Expo SDK 57 + Expo Router) basada en el estudio UX `Diseño UX-Informador`.
La interfaz usa **Material Design 3** mediante [React Native Paper](https://callstack.github.io/react-native-paper/).

## Ejecutar

```bash
pnpm install
pnpm start      # escanear el QR con Expo Go
```

## Estructura (según el mapa del sitio del estudio UX)

| Pestaña | Archivo | Qué incluye |
| --- | --- | --- |
| Inicio | `src/app/(tabs)/index.tsx` | Mapa a pantalla completa con hoja inferior arrastrable "En esta zona", radio ajustable |
| Alertas | `src/app/(tabs)/alertas.tsx` | Lista + **Filtros** (categoría, fecha, cercanía, solo validadas, orden) |
| Mis sitios | `src/app/(tabs)/mis-sitios.tsx` | Casa, trabajo y sitios de interés con sus alertas cercanas |
| Compartir (botón flotante "+") | `src/app/compartir.tsx` | Editor de noticias: categoría, texto, imagen, ubicación |
| Detalle | `src/app/alerta/[id].tsx` | Validar noticia, valoración del informante, reportar contenido, compartir |

- `src/lib/store.tsx`: estado global, ubicación y persistencia local (AsyncStorage).
- `src/lib/theme.ts`: tema Material 3 claro/oscuro con el color de marca.
- `src/components/alert-map.tsx`: mapa (Leaflet + OpenStreetMap en un `WebView`); `alert-map.web.tsx` es el reemplazo para web.

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

## Datos compartidos (Supabase)

Sin configurar nada, los datos se guardan solo en el teléfono (modo local, con alertas de ejemplo).
Para compartir alertas entre vecinos la app usa **Supabase** (plan gratuito): sigue los pasos de
[`supabase/README.md`](supabase/README.md) y crea un `.env` con `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. Con las claves puestas, la app pasa sola a modo servidor.
Las notificaciones push siguen pendientes.

## Generar la APK (EAS Build)

```bash
eas login            # cuenta gratis en expo.dev
pnpm apk              # genera el .apk en la nube
```

Al terminar, EAS da un link y un QR para descargar la APK. No hace falta ninguna API key:
el mapa usa OpenStreetMap + Leaflet (en un WebView), gratis. Necesita conexión a internet
para cargar los mosaicos del mapa.
