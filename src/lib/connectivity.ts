// Comprobación simple de conexión: pide una URL diminuta que responde 204. Evita añadir una
// librería nativa solo para saber si hay internet (sería necesario recompilar la app).
const PROBE_URL = 'https://www.gstatic.com/generate_204';

export async function isOnline(timeoutMs = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(PROBE_URL, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
