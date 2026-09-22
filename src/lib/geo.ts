import type { Coords } from './types';

// Palermo, Buenos Aires: ubicación de respaldo si el usuario no da permiso de ubicación.
export const DEFAULT_COORDS: Coords = { latitude: -34.5889, longitude: -58.4306 };

export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
}

// Desplaza unas coordenadas N metros hacia el norte y E metros hacia el este.
export function offset(origin: Coords, north: number, east: number): Coords {
  return {
    latitude: origin.latitude + north / 111320,
    longitude: origin.longitude + east / (111320 * Math.cos((origin.latitude * Math.PI) / 180)),
  };
}

export function regionFor(center: Coords, radius: number) {
  const delta = (radius * 2.6) / 111320;
  return { ...center, latitudeDelta: delta, longitudeDelta: delta };
}
