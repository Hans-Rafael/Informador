import type { CategoryId, SiteType } from './types';

// `color` para pines y fondos; `onDark` es el tono claro para texto sobre fondos oscuros.
type CategoryInfo = { id: CategoryId; label: string; icon: string; color: string; onDark: string };

// Colores por importancia (Customer Journey, "Oportunidades"): rojo peligroso, verde recreacional.
export const CATEGORIES: CategoryInfo[] = [
  { id: 'seguridad', label: 'Seguridad', icon: 'shield-alert', color: '#D32F2F', onDark: '#FF8A80' },
  { id: 'transito', label: 'Tránsito y calles', icon: 'car', color: '#F57C00', onDark: '#FFB74D' },
  { id: 'servicios', label: 'Servicios públicos', icon: 'pipe-leak', color: '#1976D2', onDark: '#90CAF9' },
  { id: 'cultura', label: 'Cultura y eventos', icon: 'palette', color: '#388E3C', onDark: '#A5D6A7' },
  { id: 'comercio', label: 'Promos y comercio', icon: 'storefront', color: '#7B1FA2', onDark: '#E1BEE7' },
];

export function getCategory(id: CategoryId): CategoryInfo {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function categoryTextColor(id: CategoryId, dark: boolean): string {
  const category = getCategory(id);
  return dark ? category.onDark : category.color;
}

export const SITE_TYPES: Record<SiteType, { label: string; icon: string }> = {
  casa: { label: 'Casa', icon: 'home' },
  trabajo: { label: 'Trabajo', icon: 'briefcase' },
  interes: { label: 'Sitio de interés', icon: 'star' },
};

export const RADIUS_OPTIONS = [500, 1000, 3000, 10000];

export const REPORT_REASONS = [
  'Información falsa (fake news)',
  'Contenido ofensivo o inapropiado',
  'Spam o publicidad engañosa',
  'Ubicación incorrecta',
];

// Umbrales de moderación comunitaria.
export const VALIDATED_THRESHOLD = 3;
export const HIDDEN_REPORTS_THRESHOLD = 3;
