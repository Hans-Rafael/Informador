// Borra del bucket "alert-images" la foto de una alerta eliminada.
// Lo llama el trigger de la tabla alerts (vía pg_net) con un secreto compartido (CLEANUP_SECRET).
// La clave de administrador no se guarda en la base de datos: Supabase la inyecta aquí por dentro.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Las fotos de la app se guardan como <id-de-usuario>/<archivo>.jpg|png.
const IMAGE_PATH = /^[0-9a-f-]{36}\/[\w.-]+\.(jpg|jpeg|png)$/i;

// Comparación en tiempo constante, para no filtrar el secreto por diferencias de tiempo.
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CLEANUP_SECRET");
  const sent = req.headers.get("x-cleanup-secret");
  if (!secret || !sent || !safeEqual(sent, secret)) {
    return new Response("forbidden", { status: 403 });
  }

  const { image_path } = await req.json().catch(() => ({}));
  if (typeof image_path !== "string" || !IMAGE_PATH.test(image_path)) {
    return new Response("invalid image_path", { status: 400 });
  }

  const { error } = await supabase.storage.from("alert-images").remove([image_path]);
  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok");
});
