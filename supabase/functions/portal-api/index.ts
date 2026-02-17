import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify the user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "dashboard": {
        // Get souscripteur linked to this user
        const { data: souscripteur } = await supabase
          .from("souscripteurs")
          .select("*, offres(nom, code, couleur)")
          .eq("user_id", user.id)
          .single();

        if (!souscripteur) {
          return new Response(JSON.stringify({ error: "Souscripteur non trouvé" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Get plantations
        const { data: plantations } = await supabase
          .from("plantations")
          .select("*, regions(nom), departements(nom), sous_prefectures(nom)")
          .eq("souscripteur_id", souscripteur.id)
          .order("created_at", { ascending: false });

        // Get recent payments
        const { data: paiements } = await supabase
          .from("paiements")
          .select("*")
          .eq("souscripteur_id", souscripteur.id)
          .order("created_at", { ascending: false })
          .limit(20);

        // Get active promotion
        const now = new Date().toISOString();
        const { data: promotions } = await supabase
          .from("promotions")
          .select("*")
          .eq("active", true)
          .lte("date_debut", now)
          .gte("date_fin", now)
          .limit(1);

        // Get active offers
        const { data: offres } = await supabase
          .from("offres")
          .select("*")
          .eq("actif", true)
          .order("ordre");

        return new Response(JSON.stringify({
          souscripteur,
          plantations: plantations || [],
          paiements: paiements || [],
          promotion: promotions?.[0] || null,
          offres: offres || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "paiement-history": {
        const { data: souscripteur } = await supabase
          .from("souscripteurs")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!souscripteur) {
          return new Response(JSON.stringify({ error: "Souscripteur non trouvé" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { data: paiements } = await supabase
          .from("paiements")
          .select("*, plantations(id_unique, nom_plantation)")
          .eq("souscripteur_id", souscripteur.id)
          .order("created_at", { ascending: false })
          .limit(100);

        return new Response(JSON.stringify({ paiements: paiements || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "geo-data": {
        // Return active geographic data for forms
        const [
          { data: districts },
          { data: regions },
          { data: departements },
          { data: sousPrefectures },
        ] = await Promise.all([
          supabase.from("districts").select("id, nom").eq("est_actif", true).order("nom"),
          supabase.from("regions").select("id, nom, district_id").eq("est_active", true).order("nom"),
          supabase.from("departements").select("id, nom, region_id").eq("est_actif", true).order("nom"),
          supabase.from("sous_prefectures").select("id, nom, departement_id").eq("est_active", true).order("nom"),
        ]);

        return new Response(JSON.stringify({
          districts: districts || [],
          regions: regions || [],
          departements: departements || [],
          sous_prefectures: sousPrefectures || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "notifications": {
        const { data: notifications } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        return new Response(JSON.stringify({ notifications: notifications || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "tickets": {
        if (req.method === "POST") {
          const body = await req.json();
          const { data: souscripteur } = await supabase
            .from("souscripteurs")
            .select("id")
            .eq("user_id", user.id)
            .single();

          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          const { error } = await supabase.from("tickets_techniques").insert({
            titre: body.titre,
            description: body.description,
            priorite: body.priorite || "moyenne",
            plantation_id: body.plantation_id || null,
            cree_par: profile?.id || null,
          });

          if (error) throw error;
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // GET tickets
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        const { data: tickets } = await supabase
          .from("tickets_techniques")
          .select("*")
          .eq("cree_par", profile?.id)
          .order("created_at", { ascending: false });

        return new Response(JSON.stringify({ tickets: tickets || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Action non reconnue" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error: any) {
    console.error("Portal API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
