import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find overdue payments (past due date, still pending)
    const today = new Date().toISOString().split("T")[0];

    const { data: overduePaiements, error: pErr } = await supabase
      .from("paiements")
      .select(`
        id, montant, date_echeance, reference, type_paiement,
        souscripteur_id,
        souscripteurs (id, nom_complet, telephone, user_id)
      `)
      .in("statut", ["en_attente", "partiel"])
      .lt("date_echeance", today)
      .order("date_echeance", { ascending: true })
      .limit(100);

    if (pErr) throw pErr;

    const notifications: any[] = [];
    const summary = { total: overduePaiements?.length || 0, notified: 0 };

    for (const paiement of overduePaiements || []) {
      const souscripteur = paiement.souscripteurs as any;
      if (!souscripteur) continue;

      const daysPastDue = Math.floor(
        (new Date().getTime() - new Date(paiement.date_echeance).getTime()) / (1000 * 60 * 60 * 24)
      );

      let priority = "info";
      if (daysPastDue > 30) priority = "urgent";
      else if (daysPastDue > 14) priority = "warning";

      // Create notification for the subscriber if they have a user_id
      if (souscripteur.user_id) {
        notifications.push({
          user_id: souscripteur.user_id,
          type: "paiement_retard",
          title: `Paiement en retard - ${daysPastDue} jour(s)`,
          message: `Votre paiement de ${paiement.montant.toLocaleString()} FCFA (réf: ${paiement.reference || "N/A"}) est en retard de ${daysPastDue} jour(s). Veuillez régulariser votre situation.`,
          data: {
            paiement_id: paiement.id,
            montant: paiement.montant,
            days_overdue: daysPastDue,
            priority,
          },
        });
      }

      // Notify hierarchy (admins, managers)
      await supabase.rpc("notify_hierarchy", {
        p_type: "paiement_retard",
        p_title: `Retard de paiement - ${souscripteur.nom_complet}`,
        p_message: `Paiement de ${paiement.montant.toLocaleString()} FCFA en retard de ${daysPastDue} jour(s) pour ${souscripteur.nom_complet} (${souscripteur.telephone})`,
        p_data: {
          paiement_id: paiement.id,
          souscripteur_id: souscripteur.id,
          montant: paiement.montant,
          days_overdue: daysPastDue,
          priority,
        },
      });

      // Flag plantation for non-payment alert
      if (daysPastDue > 7) {
        await supabase
          .from("plantations")
          .update({ alerte_non_paiement: true })
          .eq("souscripteur_id", souscripteur.id);
      }

      summary.notified++;
    }

    // Bulk insert subscriber notifications
    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(JSON.stringify({
      success: true,
      summary,
      message: `${summary.notified} relance(s) envoyée(s) sur ${summary.total} paiement(s) en retard`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
