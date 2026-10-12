// Borra del bucket "alert-images" la foto de una alerta eliminada.
// Lo llama el trigger de la tabla alerts (vía pg_net) con un secreto compartido.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.headers.get("x-cleanup-secret") !== Deno.env.get("CLEANUP_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const { image_path } = await req.json().catch(() => ({}));
  if (typeof image_path !== "string" || !image_path) {
    return new Response("missing image_path", { status: 400 });
  }
  const { error } = await supabase.storage.from("alert-images").remove([image_path]);
  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok");
});
