export type CategoryId = 'seguridad' | 'transito' | 'cultura' | 'comercio' | 'servicios';

export type Coords = { latitude: number; longitude: number };

export type Alert = {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  imageUri?: string;
  coords: Coords;
  createdAt: number;
  /** rating solo existe en las alertas de ejemplo; con servidor todavía no se calcula. */
  author: { name: string; rating?: number; contributions: number };
  /** Id del autor en el servidor (para contar sus aportes). */
  authorId?: string;
  validations: number;
  reports: number;
  mine?: boolean;
};

export type SiteType = 'casa' | 'trabajo' | 'interes';

export type Site = {
  id: string;
  type: SiteType;
  name: string;
  coords: Coords;
};

export type DateFilter = 'hoy' | 'semana' | 'todo';
export type SortBy = 'fecha' | 'cercania';

export type Filters = {
  categories: CategoryId[];
  date: DateFilter;
  radius: number;
  onlyValidated: boolean;
  sortBy: SortBy;
};
