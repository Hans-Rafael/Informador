// Extiende app.json con valores secretos que no deben quedar en el repositorio.
// La key de Google Maps se pega en .env.local y se sube a EAS con `npm run subir-key`.
const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

// Sin key, la APK se cerraría al abrir el mapa: mejor frenar la compilación en EAS.
if (process.env.EAS_BUILD === 'true' && !mapsKey) {
  throw new Error('Falta GOOGLE_MAPS_API_KEY. Pegala en .env.local y corré `npm run subir-key`.');
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [...config.plugins, ['react-native-maps', { androidGoogleMapsApiKey: mapsKey }]],
});
