# InfoBarrio

> **Tu ciudad, tu noticia.** Las noticias a tu alrededor: contribuí o recibilas.

InfoBarrio (nombre de trabajo: *Informador*) es una app móvil para enterarte de lo que pasa **a la vuelta de tu esquina** y contárselo a tus vecinos: cortes de calle, perros sueltos, ferias, promociones del barrio, cortes de servicios. Las alertas se ven en un mapa, se pueden **validar** entre vecinos y se pueden **reportar** si son falsas o inapropiadas.

El proyecto nace de un estudio de UX completo (investigación, benchmarking, proto-personas, card sorting, wireframes) y esta app es su MVP.

<!--
Capturas: súbelas a docs/screenshots/ y descomenta.

| Inicio | Alertas | Mis sitios | Compartir |
| --- | --- | --- | --- |
| ![Inicio](docs/screenshots/inicio.png) | ![Alertas](docs/screenshots/alertas.png) | ![Mis sitios](docs/screenshots/mis-sitios.png) | ![Compartir](docs/screenshots/compartir.png) |
-->

## Qué incluye

| Funcionalidad del MVP | Estado |
| --- | --- |
| Mapa con geolocalización del usuario | ✅ |
| Alertas en el mapa, con color e ícono por categoría | ✅ |
| Editor de noticias (categoría, texto, foto y ubicación) | ✅ |
| Selección de categoría | ✅ |
| Filtros por categoría, fecha, cercanía, validadas y orden | ✅ |
| Validación de noticias entre vecinos | ✅ |
| Moderación y reporte de contenido (se oculta con 3 reportes) | ✅ |
| Mis sitios (casa, trabajo y lugares de interés) | ✅ |
| Alertas compartidas entre usuarios (Supabase, en tiempo real) | ✅ |
| Pantalla de bienvenida y aviso de sin conexión en el mapa | ✅ |
| Notificaciones push por radio | ✅ (requiere Firebase, ver `supabase/README.md`) |
| Valoración (reputación) del informante | ⏳ pendiente en el servidor |
| Registro de usuario y perfiles | ⏳ deseable |

Sin configurar nada, la app funciona en **modo local**: los datos se guardan solo en el teléfono y hay alertas de ejemplo. Con las claves de Supabase puestas pasa sola a **modo servidor**.

## Pantallas

Siguen el mapa del sitio del estudio UX.

| Pantalla | Archivo | Qué hace |
| --- | --- | --- |
| Inicio | `src/app/(tabs)/index.tsx` | Mapa a pantalla completa y hoja inferior arrastrable "En esta zona" con radio ajustable |
| Alertas | `src/app/(tabs)/alertas.tsx` | Lista de alertas, chips de categoría y hoja de **Filtros** |
| Mis sitios | `src/app/(tabs)/mis-sitios.tsx` | Casa, trabajo y sitios de interés con sus alertas cercanas |
| Compartir | `src/app/compartir.tsx` | Editor de noticias (se abre desde la 4.ª pestaña) |
| Detalle | `src/app/alerta/[id].tsx` | Validar, reportar, compartir y ver al informante |
| Bienvenida | `src/components/welcome.tsx` | Primer uso: explica la app y pide la ubicación |

## Tecnologías

- [React Native](https://reactnative.dev/) 0.86 con [Expo](https://expo.dev/) SDK 57 y [Expo Router](https://docs.expo.dev/router/introduction/)
- TypeScript
- [React Native Paper](https://callstack.github.io/react-native-paper/) (Material Design 3)
- Mapa: [Leaflet](https://leafletjs.com/) + OpenStreetMap dentro de un `WebView`: gratis y sin API key
- [Supabase](https://supabase.com/): base de datos Postgres, sesión anónima, almacenamiento de fotos y tiempo real
- pnpm como gestor de paquetes

## Estructura

```
src/
  app/            Pantallas y rutas (Expo Router)
  components/     Tarjetas, mapa, hoja inferior, chips, bienvenida…
  lib/
    store.tsx       Estado global, ubicación y persistencia local
    remote.ts       Acceso a Supabase (alertas, votos, fotos)
    supabase.ts     Cliente de Supabase (null si faltan las claves)
    connectivity.ts Comprobación de conexión para el mapa
    push.ts         Permiso y token de notificaciones
    categories.ts   Categorías, radios y umbrales
    theme.ts        Tema Material 3 claro y oscuro
supabase/
  schema.sql      Tablas, reglas de seguridad (RLS) e imágenes
  push.sql        Tokens y trigger de notificaciones por radio
  README.md       Puesta en marcha de Supabase
```

## Empezar

### Requisitos

- Node.js 20 o superior (probado con 22) y [pnpm](https://pnpm.io/) (`corepack enable`)
- Para compilar en tu PC: JDK 17 o superior (probado con 21) y el Android SDK
  (plataforma 36, build-tools 36.0.0 y NDK 27.1.12297006), con `ANDROID_HOME` configurado
- Un teléfono Android con **depuración USB** activada, o un emulador

### Instalar y ejecutar

```bash
pnpm install

# 1. Compila e instala la app de desarrollo en el teléfono conectado (la primera vez tarda unos minutos)
pnpm android

# 2. Arranca el servidor de JavaScript. Los cambios se ven al guardar (o con `r`)
adb reverse tcp:8081 tcp:8081
pnpm start --dev-client
```

El proyecto usa `expo-dev-client`, así que necesita esta *development build*: no basta con Expo Go. Mientras cambies solo código en `src/`, no hace falta volver a compilar. Si añades o cambias dependencias nativas, ejecuta de nuevo `pnpm android`.

Si Metro no ve un archivo nuevo, reinícialo limpiando la caché: `pnpm start --dev-client -c`.

### Conectar Supabase (datos compartidos)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com), activa **Anonymous Sign-Ins** y ejecuta `supabase/schema.sql` en el SQL Editor. Los pasos detallados están en [`supabase/README.md`](supabase/README.md).
2. Crea un archivo `.env` en la raíz (no se sube a git):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
   ```

3. Reinicia Metro con `pnpm start --dev-client -c`: Expo lee el `.env` al arrancar.

La clave `anon`/*publishable* es pública por diseño y puede ir dentro de la app: la protección real son las reglas RLS de `schema.sql`. **Nunca** pongas la clave `service_role` en la app ni en el repositorio.

### Notificaciones push por radio

Cuando alguien publica una alerta, los teléfonos que la tienen dentro de su radio (menos el autor) reciben un aviso, y al tocarlo se abre la alerta. Se activan en la bienvenida o con el interruptor **Avisarme de alertas cercanas** de *Alertas → Filtros*. Se guarda solo una zona aproximada (~100 m), nunca la posición exacta.

Requisitos (todo gratuito):

1. **Supabase:** ejecutar `supabase/push.sql` en el SQL Editor (tabla de tokens y trigger de envío).
2. **Firebase:** crear un proyecto, registrar la app Android `com.hansgarcia.infobarrio` y poner el `google-services.json` en la raíz del proyecto (no se sube a git).
3. **EAS:** subir la clave de cuenta de servicio de Firebase con `pnpm exec eas credentials -p android` (FCM V1). **Es un secreto: no la subas a git.**
4. **Recompilar** la app una vez (`pnpm android`), porque `expo-notifications` es una librería nativa.

Los pasos detallados y cómo probarlo están al final de [`supabase/README.md`](supabase/README.md). Sin `google-services.json` la app compila igual, pero sin push; y hace falta un teléfono real, los emuladores no reciben notificaciones.

## Generar el APK

**En tu PC** (la opción más rápida; usa tu `.env` y deja la app instalada en el teléfono):

```bash
pnpm android --variant release
# APK: android/app/build/outputs/apk/release/app-release.apk
```

**En la nube con EAS Build** (para compartir un enlace de descarga):

```bash
pnpm exec eas login
# Una vez: darle las claves públicas a EAS (el .env local no llega a la nube)
pnpm exec eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://TU-PROYECTO.supabase.co --visibility plaintext
pnpm exec eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value tu-clave-publica --visibility plaintext

pnpm apk    # eas build -p android --profile preview
```

Para las notificaciones push, EAS también necesita el `google-services.json`, que no está en git. Entrégaselo como variable de archivo (una vez):

```bash
pnpm exec eas env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive
```

EAS construye con lo que hay en tu carpeta local. Con el plan gratuito, la cola puede tardar más de una hora. Si te falta algún indicador de `eas env:create`, mira `pnpm exec eas env:create --help`.

La versión final de tu PC lleva el JavaScript **dentro** del APK: no se actualiza sola. Cada vez que cambies código hay que volver a compilarla. El APK firmado con la clave de prueba sirve para testers, no para subirlo a Google Play.

## Decisiones de diseño

El estudio UX (en `Diseño UX-Informador`) guía la interfaz:

- **Home** con mapa arriba y hoja "En esta zona" abajo, como en los wireframes.
- **Barra inferior de 4 ítems**: Inicio, Alertas, Mis sitios y Compartir.
- **Filtros dentro de Alertas**, como recomendó el card sorting.
- **Color de alerta por categoría** (rojo para seguridad, naranja para tránsito…), como proponía el user journey.
- **Nombre InfoBarrio**, elegido por los usuarios en la encuesta de naming.

## Hoja de ruta

- [ ] Elegir qué categorías avisan, y limpiar tokens caducados
- [ ] Valoración del informante calculada en el servidor
- [ ] Registro de usuario y perfiles con métricas de contribución
- [ ] Modo sin conexión: mosaicos del mapa en caché y alertas guardadas
- [ ] Compartir ubicación y botón de emergencia
- [ ] Versión para iPhone

## Autor

**Hans García** · [LinkedIn](https://linkedin.com/in/hans-garcia-developer) · [GitHub](https://github.com/Hans-Rafael)

## Licencia

[MIT](LICENSE)
