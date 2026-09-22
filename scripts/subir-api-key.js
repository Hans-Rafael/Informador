// Lee GOOGLE_MAPS_API_KEY de .env.local y la guarda como variable secreta en EAS,
// para que la compilación en la nube la use sin subirla a GitHub.
// Uso: npm run subir-key
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
const match = fs.existsSync(envFile)
  ? fs.readFileSync(envFile, 'utf8').match(/^GOOGLE_MAPS_API_KEY=(.*)$/m)
  : null;
const key = match?.[1].trim();

if (!key) {
  console.error('✖ Falta la key: pegala en .env.local después de "GOOGLE_MAPS_API_KEY=".');
  process.exit(1);
}

execFileSync(
  'eas',
  [
    'env:create',
    '--name', 'GOOGLE_MAPS_API_KEY',
    '--value', key,
    '--environment', 'preview',
    '--environment', 'production',
    '--visibility', 'sensitive',
    '--force',
    '--non-interactive',
  ],
  { stdio: 'inherit' },
);
console.log('✔ Key guardada en EAS. Ya podés correr: npm run apk');
