import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (p: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(p), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Vérification du demandeur (doit être admin)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Non authentifié" }, 401);
    const { data: caller } = await admin.auth.getUser(token);
    if (!caller?.user) return json({ error: "Session invalide" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.user.id });
    if (!isAdmin) return json({ error: "Accès réservé aux administrateurs" }, 403);

    const { request_id, action, role, motif_rejet } = await req.json();
    if (!request_id || !action) return json({ error: "request_id et action requis" }, 400);

    const { data: reqRow, error: reqErr } = await admin
      .from("account_requests").select("*").eq("id", request_id).maybeSingle();
    if (reqErr || !reqRow) return json({ error: "Demande introuvable" }, 404);

    if (action === "delete") {
      if (reqRow.auth_user_id && reqRow.statut !== "approuve") {
        await admin.auth.admin.deleteUser(reqRow.auth_user_id).catch(() => {});
      }
      await admin.from("account_requests").delete().eq("id", request_id);
      return json({ success: true, deleted: true });
    }

    if (action === "reject") {
      if (reqRow.auth_user_id) {
        await admin.auth.admin.deleteUser(reqRow.auth_user_id).catch(() => {});
        await admin.from("profiles").delete().eq("id", reqRow.auth_user_id).catch?.(() => {});
      }
      await admin.from("account_requests").update({
        statut: "rejete",
        motif_rejet: motif_rejet ?? null,
        traite_par: caller.user.id,
        traite_le: new Date().toISOString(),
      }).eq("id", request_id);
      return json({ success: true, rejected: true });
    }

    if (action !== "approve") return json({ error: "Action inconnue" }, 400);

    const finalRole = role || reqRow.role_souhaite;
    let userId: string | null = reqRow.auth_user_id;
    let tempPassword: string | null = null;

    // Compte auth manquant (ancienne demande) → création avec mot de passe temporaire
    if (!userId) {
      tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 14) + "A1!";
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: reqRow.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nom_complet: reqRow.nom_complet },
      });
      if (cErr) return json({ error: cErr.message }, 400);
      userId = created.user!.id;
    }

    await admin.from("profiles").upsert({
      id: userId,
      user_id: userId,
      email: reqRow.email,
      nom_complet: reqRow.nom_complet,
      telephone: reqRow.telephone,
      username: reqRow.username ?? reqRow.email.split("@")[0],
      poste: reqRow.poste_souhaite,
      district_id: reqRow.district_id,
      region_id: reqRow.region_id,
      actif: true,
    }, { onConflict: "id" });

    // Rôle : écrit systématiquement dans user_roles
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: finalRole }, { onConflict: "user_id,role" });
    if (roleErr) return json({ error: `Attribution du rôle impossible: ${roleErr.message}` }, 400);

    await admin.from("account_requests").update({
      statut: "approuve",
      auth_user_id: userId,
      traite_par: caller.user.id,
      traite_le: new Date().toISOString(),
    }).eq("id", request_id);

    return json({ success: true, user_id: userId, role: finalRole, temp_password: tempPassword });
  } catch (e) {
    console.error("approve-account-request error", e);
    return json({ error: (e as Error).message }, 500);
  }
});