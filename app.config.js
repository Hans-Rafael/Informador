const fs = require('fs');
const path = require('path');

// El mapa usa OpenStreetMap + Leaflet (WebView): no hace falta ninguna API key.
//
// Las notificaciones push de Android necesitan el google-services.json de Firebase. No se sube a
// git: en tu PC va en la raíz del proyecto y en EAS Build se entrega con la variable de archivo
// GOOGLE_SERVICES_JSON (ver supabase/README.md). Si no existe, la app compila igual, solo que sin push.
module.exports = ({ config }) => {
  const googleServices = process.env.GOOGLE_SERVICES_JSON ?? path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    config.android = { ...config.android, googleServicesFile: googleServices };
  }
  return config;
};
