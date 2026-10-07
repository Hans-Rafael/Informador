import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Las claves se leen de .env (ver supabase/README.md). La clave "anon" es pública por diseño:
// la protección real son las reglas RLS de supabase/schema.sql.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** null cuando faltan las claves: la app funciona entonces en modo local, sin servidor. */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const remoteEnabled = supabase !== null;

export const IMAGE_BUCKET = 'alert-images';
