import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Etape1Souscripteur } from "@/components/forms/souscription/Etape1Souscripteur";
import { Etape2Cotitulaire } from "@/components/forms/souscription/Etape2Cotitulaire";
import { Etape0Offre } from "@/components/forms/souscription/Etape0Offre";
import { Etape5Documents } from "@/components/forms/souscription/Etape5Documents";
import { Etape6Confirmation } from "@/components/forms/souscription/Etape6Confirmation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NouvelleSouscription = () => {
  const [etapeActuelle, setEtapeActuelle] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [brouillonId, setBrouillonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Étapes du contrat V3 — Souscription uniquement (sans parcelle, sans enquête)
  // La conversion en plantation se fait depuis la page Plantations.
  const etapes = useMemo(() => {
    return [
      { num: 1, titre: "Souscripteur", component: Etape1Souscripteur },
      { num: 2, titre: "Co-titulaire", component: Etape2Cotitulaire },
      { num: 3, titre: "Offre", component: Etape0Offre },
      { num: 4, titre: "Documents", component: Etape5Documents },
      { num: 5, titre: "Confirmation", component: Etape6Confirmation },
    ];
  }, []);

  // Charger le brouillon existant au montage
  useEffect(() => {
    const chargerBrouillon = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: brouillons } = await (supabase as any)
        .from("souscriptions_brouillon")
        .select("*")
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (brouillons && brouillons.length > 0) {
        const brouillon = brouillons[0];
        setBrouillonId(brouillon.id);
        setFormData(brouillon.donnees);
        setEtapeActuelle(Math.min(brouillon.etape_actuelle, etapes.length - 1));
        toast({
          title: "Brouillon récupéré",
          description: "Reprise de votre souscription en cours",
        });
      }
    };

    chargerBrouillon();
  }, []);

  const updateFormData = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
  };

  const sauvegarderBrouillon = async (nouvelleEtape?: number) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const etape = nouvelleEtape ?? etapeActuelle;
      
      if (brouillonId) {
        const { error } = await (supabase as any)
          .from("souscriptions_brouillon")
          .update({
            etape_actuelle: etape,
            donnees: formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", brouillonId);

        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("souscriptions_brouillon")
          .insert({
            etape_actuelle: etape,
            donnees: formData,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setBrouillonId(data.id);
      }

      toast({
        title: "Sauvegarde réussie",
        description: "Vos données ont été enregistrées",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const passerEtapeSuivante = async () => {
    const nouvelleEtape = Math.min(etapes.length - 1, etapeActuelle + 1);
    await sauvegarderBrouillon(nouvelleEtape);
    setEtapeActuelle(nouvelleEtape);
  };

  const passerEtapePrecedente = () => {
    setEtapeActuelle(Math.max(0, etapeActuelle - 1));
  };

  const soumettreFormulaire = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      if (!formData.nom_famille || !formData.prenoms || !formData.telephone || !formData.offre_id) {
        throw new Error("Veuillez remplir tous les champs obligatoires (identité, coordonnées et offre)");
      }

      // Générer l'ID unique
      const { data: genId, error: genErr } = await (supabase as any).rpc('generate_souscripteur_id');
      if (genErr) throw genErr;

      // Créer le souscripteur
      const nomComplet = `${formData.nom_famille || ''} ${formData.prenoms || ''}`.trim();
      
      const { data: souscripteur, error: errorSous } = await (supabase as any)
        .from("souscripteurs")
        .insert({
          id_unique: genId,
          offre_id: formData.offre_id,
          parcelle_id: formData.parcelle_id || null,
          type_souscripteur: formData.type_souscripteur || "sans_terre",
          type_souscripteur_foncier: formData.type_souscripteur_foncier || (formData.type_souscripteur === "avec_terre" ? "OWN" : "EXT"),
          nom: formData.nom_famille || "",
          prenoms: formData.prenoms || "",
          nom_complet: nomComplet,
          nom_famille: formData.nom_famille || "",
          civilite: formData.civilite || null,
          date_naissance: formData.date_naissance || null,
          lieu_naissance: formData.lieu_naissance || "",
          nationalite: formData.nationalite || "Ivoirienne",
          statut_marital: formData.statut_marital || null,
          type_piece: formData.type_piece?.toLowerCase() || 'cni',
          numero_piece: formData.numero_piece || "",
          date_delivrance_piece: formData.date_delivrance_piece || null,
          telephone: formData.telephone || "",
          whatsapp: formData.whatsapp || null,
          email: formData.email || null,
          domicile: formData.domicile || null,
          localite: formData.localite || null,
          district_id: formData.district_id || null,
          region_id: formData.region_id || null,
          departement_id: formData.departement_id || null,
          sous_prefecture_id: formData.sous_prefecture_id || null,
          type_compte: formData.type_compte || null,
          banque_operateur: formData.banque_operateur || null,
          numero_compte: formData.numero_compte || null,
          nom_titulaire_compte: formData.nom_beneficiaire || null,
          created_by: user.id,
          updated_by: user.id,
          statut: 'actif',
          statut_global: 'actif',
        })
        .select()
        .single();

      if (errorSous) throw errorSous;

      // Supprimer le brouillon
      if (brouillonId) {
        await (supabase as any).from("souscriptions_brouillon").delete().eq("id", brouillonId);
      }

      toast({
        title: "✅ Souscription enregistrée",
        description: `N° Contrat: ${souscripteur.numero_contrat || souscripteur.id_unique || souscripteur.id}`,
      });

      navigate("/souscriptions");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Ensure etapeActuelle doesn't exceed available steps
  const safeEtape = Math.min(etapeActuelle, etapes.length - 1);
  const EtapeComponent = etapes[safeEtape].component;
  const isLastStep = safeEtape === etapes.length - 1;

  return (
    <ProtectedRoute>
      <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nouvelle Souscription</h1>
          <p className="text-muted-foreground">
            Contrat de Souscription V3 — Sauvegarde automatique
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {etapes.map((etape, index) => (
            <Button
              key={`${etape.titre}-${index}`}
              variant={safeEtape === index ? "default" : "outline"}
              size="sm"
              onClick={() => setEtapeActuelle(index)}
              className="min-w-fit"
            >
              {etape.num}. {etape.titre}
            </Button>
          ))}
        </div>

        <Card className="p-6">
          <EtapeComponent formData={formData} updateFormData={updateFormData} />
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={passerEtapePrecedente}
            disabled={safeEtape === 0 || saving}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>

          {!isLastStep ? (
            <Button onClick={passerEtapeSuivante} disabled={saving}>
              {saving ? "Sauvegarde..." : "Suivant"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="bg-primary"
              onClick={soumettreFormulaire}
              disabled={saving || !formData.contrat_lu}
            >
              {saving ? "Envoi en cours..." : "✓ SOUMETTRE LA SOUSCRIPTION"}
            </Button>
          )}
        </div>
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default NouvelleSouscription;
