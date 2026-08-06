import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (p: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(p), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

const VALID_ROLES = [
  "commercial", "technicien", "chef_equipe_commercial", "chef_equipe_technique",
  "responsable_commercial", "responsable_technique_agronomique", "responsable_zone",
  "comptable", "service_client", "operations",
];

// Rôles terrain autorisés à s'inscrire directement (accès immédiat, sans validation admin)
const SELF_SERVICE_ROLES = ["commercial", "technicien"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let step = "init";
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json();
    const {
      username, password, email, nom_complet, telephone, role_souhaite,
      poste_souhaite, district_id, region_id, departement_geo_id, departement, justification,
    } = body ?? {};

    if (!username || !password || !email || !nom_complet || !telephone || !role_souhaite) {
      return json({ error: "Champs obligatoires manquants (identifiant, mot de passe, email, nom, téléphone, rôle).", step: "validate_body" }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "Le mot de passe doit contenir au moins 8 caractères.", step: "validate_password" }, 400);
    }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(String(username))) {
      return json({ error: "Identifiant invalide (3 à 30 caractères : lettres, chiffres, . _ -).", step: "validate_username" }, 400);
    }
    if (!VALID_ROLES.includes(String(role_souhaite))) {
      return json({ error: `Rôle invalide: ${role_souhaite}`, step: "validate_role" }, 400);
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    // Username déjà pris ?
    const { data: available } = await admin.rpc("username_available", { _username: cleanUsername });
    if (available === false) {
      return json({ error: "Cet identifiant est déjà utilisé. Choisissez-en un autre.", step: "username_available" }, 409);
    }

    // Email déjà existant ?
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("nom_complet, email, telephone, photo_url, username, poste")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return json({
        error: "email_exists",
        message: `Cet email est déjà attribué à ${existingProfile.nom_complet}.`,
        owner: existingProfile,
        step: "email_exists",
      }, 409);
    }

    // Création du compte auth (sans rôle → aucun accès avant validation admin)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { nom_complet, username: cleanUsername, pending_role: role_souhaite },
    });

    if (createErr) {
      const msg = String(createErr.message || "");
      if (/already/i.test(msg)) {
        return json({ error: "email_exists", message: "Un compte existe déjà avec cet email.", step: "create_auth_user" }, 409);
      }
      return json({ error: msg, step: "create_auth_user" }, 400);
    }

    const userId = created.user!.id;

    // Profil inactif jusqu'à validation
    await admin.from("profiles").upsert({
      id: userId,
      user_id: userId,
      email: cleanEmail,
      nom_complet,
      telephone,
      username: cleanUsername,
      poste: poste_souhaite ?? null,
      district_id: district_id ?? null,
      region_id: region_id ?? null,
      actif: false,
    }, { onConflict: "id" });

    const { error: reqErr } = await admin.from("account_requests").insert({
      nom_complet,
      email: cleanEmail,
      telephone,
      username: cleanUsername,
      auth_user_id: userId,
      poste_souhaite: poste_souhaite ?? role_souhaite,
      role_souhaite,
      district_id: district_id ?? null,
      region_id: region_id ?? null,
      departement_geo_id: departement_geo_id ?? null,
      departement: departement ?? null,
      justification: justification ?? null,
      statut: "en_attente",
    });

    if (reqErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      console.error("insert account_requests failed", reqErr);
      return json({ error: reqErr.message, step: "insert_account_request", details: reqErr }, 400);
    }

    // Inscription directe pour les rôles terrain : rôle attribué + profil actif immédiatement
    const immediate = SELF_SERVICE_ROLES.includes(String(role_souhaite));
    if (immediate) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .upsert({ user_id: userId, role: role_souhaite }, { onConflict: "user_id,role" });

      if (roleErr) {
        console.error("role assignment error", roleErr);
        return json({
          success: true,
          user_id: userId,
          username: cleanUsername,
          immediate_access: false,
          warning: "Compte créé mais rôle non attribué : contactez l'administrateur.",
        });
      }

      await admin.from("profiles").update({ actif: true }).eq("id", userId);
      await admin
        .from("account_requests")
        .update({ statut: "approuve", traite_le: new Date().toISOString() })
        .eq("auth_user_id", userId);
    }

    return json({
      success: true,
      user_id: userId,
      username: cleanUsername,
      immediate_access: immediate,
    });
  } catch (e) {
    console.error("submit-account-request error", e);
    return json({ error: (e as Error).message, step }, 500);
  }
});