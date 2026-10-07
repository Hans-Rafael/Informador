import { RADIUS_OPTIONS } from './categories';
import { IMAGE_BUCKET, supabase } from './supabase';
import type { Alert, CategoryId, Coords } from './types';

// Capa de acceso a Supabase. Solo se usa si hay claves (ver supabase.ts); el estado de la app
// vive en store.tsx y llama a estas funciones.

type FeedRow = {
  id: string;
  user_id: string;
  category: CategoryId;
  title: string;
  description: string;
  image_path: string | null;
  latitude: number;
  longitude: number;
  author_name: string;
  created_at: string;
  validations?: number;
  reports?: number;
};

export type NewAlert = Pick<Alert, 'category' | 'title' | 'description' | 'imageUri' | 'coords'>;

function client() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

/** Sesión anónima: un usuario por dispositivo, sin registro. Devuelve su id. */
export async function ensureUser(): Promise<string | null> {
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  return error || !anon.user ? null : anon.user.id;
}

function toAlert(row: FeedRow, userId: string, contributions: number): Alert {
  const mine = row.user_id === userId;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    imageUri: row.image_path
      ? client().storage.from(IMAGE_BUCKET).getPublicUrl(row.image_path).data.publicUrl
      : undefined,
    coords: { latitude: row.latitude, longitude: row.longitude },
    createdAt: Date.parse(row.created_at),
    // Sin valoración del informante todavía: el servidor aún no la calcula, así que no se muestra.
    author: { name: mine ? 'Vos' : row.author_name, contributions },
    authorId: row.user_id,
    validations: row.validations ?? 0,
    reports: row.reports ?? 0,
    mine,
  };
}

/** Alertas recientes dentro del cuadro que abarca el radio máximo; el filtro fino por radio es local. */
export async function fetchAlerts(center: Coords, userId: string): Promise<Alert[]> {
  const meters = Math.max(...RADIUS_OPTIONS) * 1.05;
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.max(Math.cos((center.latitude * Math.PI) / 180), 0.01));
  const { data, error } = await client()
    .from('alerts_feed')
    .select('*')
    .gte('latitude', center.latitude - dLat)
    .lte('latitude', center.latitude + dLat)
    .gte('longitude', center.longitude - dLng)
    .lte('longitude', center.longitude + dLng)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  const rows = data as FeedRow[];
  const perAuthor = new Map<string, number>();
  rows.forEach((r) => perAuthor.set(r.user_id, (perAuthor.get(r.user_id) ?? 0) + 1));
  return rows.map((r) => toAlert(r, userId, perAuthor.get(r.user_id) ?? 1));
}

/** Lo que ya validaste y reportaste (las reglas RLS solo devuelven tus propias filas). */
export async function fetchMyVotes(): Promise<{ validatedIds: string[]; reportedIds: string[] }> {
  const sb = client();
  const [v, r] = await Promise.all([
    sb.from('validations').select('alert_id'),
    sb.from('reports').select('alert_id'),
  ]);
  if (v.error) throw v.error;
  if (r.error) throw r.error;
  return {
    validatedIds: v.data.map((x) => x.alert_id as string),
    reportedIds: r.data.map((x) => x.alert_id as string),
  };
}

async function uploadImage(uri: string, userId: string): Promise<string> {
  const png = uri.toLowerCase().endsWith('.png');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${png ? 'png' : 'jpg'}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await client()
    .storage.from(IMAGE_BUCKET)
    .upload(path, body, { contentType: png ? 'image/png' : 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function publishRemote(input: NewAlert, userId: string): Promise<Alert> {
  const imagePath = input.imageUri ? await uploadImage(input.imageUri, userId) : null;
  const { data, error } = await client()
    .from('alerts')
    .insert({
      category: input.category,
      title: input.title,
      description: input.description,
      image_path: imagePath,
      latitude: input.coords.latitude,
      longitude: input.coords.longitude,
    })
    .select()
    .single();
  if (error) throw error;
  return toAlert(data as FeedRow, userId, 1);
}

// 23505 = clave duplicada: ya habías votado desde otro momento; no es un error para el usuario.
const DUPLICATE = '23505';

export async function validateRemote(alertId: string) {
  const { error } = await client().from('validations').insert({ alert_id: alertId });
  if (error && error.code !== DUPLICATE) throw error;
}

export async function reportRemote(alertId: string) {
  const { error } = await client().from('reports').insert({ alert_id: alertId });
  if (error && error.code !== DUPLICATE) throw error;
}

// ───────────── Notificaciones push ─────────────

// ~100 m de precisión: el servidor solo necesita saber la zona, no tu posición exacta.
const roundZone = (n: number) => Math.round(n * 1000) / 1000;

/** Guarda (o actualiza) el token de este dispositivo con su zona aproximada y su radio de aviso. */
export async function savePushRegistration(input: { token: string; center: Coords; radius: number }) {
  const { error } = await client()
    .from('push_tokens')
    .upsert({
      user_id: (await client().auth.getSession()).data.session?.user.id,
      token: input.token,
      latitude: roundZone(input.center.latitude),
      longitude: roundZone(input.center.longitude),
      radius_m: input.radius,
      enabled: true,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

/** Deja de recibir avisos sin borrar el token (reactivarlo es solo volver a guardar). */
export async function disablePushRegistration() {
  const userId = (await client().auth.getSession()).data.session?.user.id;
  if (!userId) return;
  const { error } = await client().from('push_tokens').update({ enabled: false }).eq('user_id', userId);
  if (error) throw error;
}
