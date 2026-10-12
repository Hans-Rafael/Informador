const fs = require('fs');
const path = require('path');

// El mapa usa OpenStreetMap + Leaflet (WebView): no hace falta ninguna API key.
//
// Las notificaciones push de Android necesitan el google-services.json de Firebase. No se sube a
// git: en tu PC va en la raíz del proyecto y en EAS Build se entrega con la variable de archivo
// GOOGLE_SERVICES_JSON (ver supabase/README.md). En desarrollo y preview, si no existe, la app
// compila igual, solo que sin push. En el build de producción es un error: sin Firebase los avisos
// no llegarían a nadie y nadie lo notaría hasta tener usuarios.
module.exports = ({ config }) => {
  const googleServices = process.env.GOOGLE_SERVICES_JSON ?? path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    config.android = { ...config.android, googleServicesFile: googleServices };
  } else if (process.env.EAS_BUILD_PROFILE === 'production') {
    throw new Error(
      'Falta google-services.json: sin Firebase la app de producción no recibiría notificaciones. ' +
        'Créalo con: pnpm exec eas env:create --environment production --name GOOGLE_SERVICES_JSON ' +
        '--type file --value ./google-services.json --visibility sensitive (ver supabase/README.md).',
    );
  }
  return config;
};
