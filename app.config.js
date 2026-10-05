// Extiende app.json. El mapa usa MapLibre + OpenStreetMap: no requiere API key.
// Importante: MapLibre es código nativo, no funciona en Expo Go (usar `npm run android` o `npm run apk`).
module.exports = ({ config }) => ({
  ...config,
  plugins: [...config.plugins, '@maplibre/maplibre-react-native'],
});
