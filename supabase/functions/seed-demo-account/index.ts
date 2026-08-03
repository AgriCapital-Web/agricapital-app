import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (p: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(p), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

const DEMO_EMAIL = "demo@agricapital.ci";
const DEMO_USERNAME = "agricapital";
const DEMO_PASSWORD = "AgriCapital";

/** Crée (ou réinitialise) le compte de démonstration en lecture seule. Idempotent. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let userId: string | null = null;
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      const found = data?.users?.find((u: any) => u.email?.toLowerCase() === DEMO_EMAIL);
      if (found) { userId = found.id; break; }
      if (!data?.users || data.users.length < 1000) break;
    }

    if (userId) {
      await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { nom_complet: "Compte Démonstration" },
      });
      if (error) return json({ error: error.message }, 400);
      userId = data.user!.id;
    }

    await admin.from("profiles").upsert({
      id: userId, user_id: userId, email: DEMO_EMAIL,
      nom_complet: "Compte Démonstration", username: DEMO_USERNAME,
      poste: "Démonstration (lecture seule)", actif: true,
    }, { onConflict: "id" });

    await admin.from("user_roles").upsert({ user_id: userId, role: "demo" }, { onConflict: "user_id,role" });

    return json({ success: true, username: DEMO_USERNAME, user_id: userId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});