import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadVisual } from "@/components/ui/file-upload-visual";
import { getCachedItems, STORES } from "@/lib/offlineDb";
import { useUserZones } from "@/hooks/useUserZones";

const InteractiveMap = lazy(() => import("@/components/maps/InteractiveMap"));
const OfflineMap = lazy(() => import("@/components/maps/OfflineMap"));


interface Etape3Props {
  formData: any;
  updateFormData: (data: any) => void;
}

export const Etape3Parcelle = ({ formData, updateFormData }: Etape3Props) => {
  const [districts, setDistricts] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [sousPrefectures, setSousPrefectures] = useState<any[]>([]);
  const [conventions, setConventions] = useState<any[]>([]);
  const [lotsDispo, setLotsDispo] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { fetchFilteredDistricts, fetchFilteredRegions, fetchFilteredDepartements, fetchFilteredSousPrefectures } = useUserZones();
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);


  useEffect(() => {
    fetchDistricts();
    fetchConventions();
  }, []);

  useEffect(() => {
    if (formData.district_id) fetchRegions(formData.district_id);
  }, [formData.district_id]);

  useEffect(() => {
    if (formData.region_id) fetchDepartements(formData.region_id);
  }, [formData.region_id]);

  useEffect(() => {
    if (formData.departement_id) fetchSousPrefectures(formData.departement_id);
  }, [formData.departement_id]);

  useEffect(() => {
    if (formData.convention_id) fetchLotsDisponibles(formData.convention_id);
  }, [formData.convention_id]);

  const fetchConventions = async () => {
    const { data } = await (supabase as any)
      .from("conventions_foncieres")
      .select("id, reference, surface_totale_ha, statut, proprietaires_terres:proprietaire_id(nom_complet, nom)")
      .eq("statut", "active")
      .order("created_at", { ascending: false });
    setConventions(data || []);
  };

  const fetchLotsDisponibles = async (conventionId: string) => {
    const { data } = await (supabase as any)
      .from("lots_hectares")
      .select("id, reference, numero_h, surface_ha, statut")
      .eq("convention_id", conventionId)
      .eq("statut", "disponible")
      .order("numero_h");
    setLotsDispo(data || []);
  };

  const fetchDistricts = async () => {
    if (navigator.onLine) {
      const data = await fetchFilteredDistricts();
      setDistricts(data);
    } else {
      try {
        const cached = await getCachedItems(STORES.DISTRICTS);
        setDistricts(cached.filter((d: any) => d.est_actif !== false));
      } catch { setDistricts([]); }
    }
  };

  const fetchRegions = async (districtId: string) => {
    if (navigator.onLine) {
      const data = await fetchFilteredRegions(districtId);
      setRegions(data);
    } else {
      const cached = await getCachedItems(STORES.REGIONS);
      setRegions(cached.filter((r: any) => r.district_id === districtId && r.est_active !== false));
    }
  };

  const fetchDepartements = async (regionId: string) => {
    if (navigator.onLine) {
      const data = await fetchFilteredDepartements(regionId);
      setDepartements(data);
    } else {
      const cached = await getCachedItems(STORES.DEPARTEMENTS);
      setDepartements(cached.filter((d: any) => d.region_id === regionId && d.est_actif !== false));
    }
  };

  const fetchSousPrefectures = async (departementId: string) => {
    if (navigator.onLine) {
      const data = await fetchFilteredSousPrefectures(departementId);
      setSousPrefectures(data);
    } else {
      const cached = await getCachedItems(STORES.SOUS_PREFECTURES);
      setSousPrefectures(cached.filter((sp: any) => sp.departement_id === departementId && sp.est_active !== false));
    }
  };

  const handleFileChange = (field: string, file: File | null, preview: string) => {
    updateFormData({
      [field]: file,
      [`${field}_preview`]: preview,
    });
  };


  const nombrePlants = formData.superficie_ha ? Math.round(formData.superficie_ha * 143) : 0;
  const typeFoncier = formData.type_souscripteur_foncier || "EXT";

  return (
    <div className="space-y-6">
      {/* Article 3 — Identification de la plantation souscrite (Contrat V3) */}
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle>Article 3 — Identification de la plantation</CardTitle>
          <CardDescription>
            Référencement officiel selon le Contrat V3 — Convention foncière, lot hectare et type foncier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type foncier du souscripteur *</Label>
            <Select
              value={typeFoncier}
              onValueChange={(v) => updateFormData({ type_souscripteur_foncier: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXT">EXT — Hectares sur parcelle d'un propriétaire tiers</SelectItem>
                <SelectItem value="OWN">OWN — Souscripteur sur sa propre terre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Convention foncière (Planté-Partagé) *</Label>
            <Select
              value={formData.convention_id || ""}
              onValueChange={(v) => updateFormData({ convention_id: v, lot_id: null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Référence AC-PP-SPxxx-DOMxxx-PARCxxx" />
              </SelectTrigger>
              <SelectContent>
                {conventions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.reference} — {c.proprietaires_terres?.nom_complet || c.proprietaires_terres?.nom || "Propriétaire"} ({c.surface_totale_ha} ha)
                  </SelectItem>
                ))}
                {conventions.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">
                    Aucune convention active. Créez d'abord une convention foncière.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {formData.convention_id && (
            <div className="space-y-2">
              <Label>Lot hectare attribué (géomètre) *</Label>
              <Select
                value={formData.lot_id || ""}
                onValueChange={(v) => updateFormData({ lot_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lot disponible" />
                </SelectTrigger>
                <SelectContent>
                  {lotsDispo.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.reference} — {l.surface_ha} ha
                    </SelectItem>
                  ))}
                  {lotsDispo.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      Aucun lot disponible sur cette convention.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Référence finale plantation : <code>…-Hxx</code> (ex. AC-PP-SP001-DOM002-PARC005-H03)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="culture_principale">Culture principale *</Label>
            <Input
              id="culture_principale"
              value={formData.culture_principale || "Palmier à huile"}
              onChange={(e) => updateFormData({ culture_principale: e.target.value })}
              placeholder="Ex: Palmier à huile"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localisation de la parcelle</CardTitle>
          <CardDescription>Informations géographiques</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Select
                value={formData.district_id}
                onValueChange={(value) => {
                  updateFormData({ district_id: value, region_id: null, departement_id: null, sous_prefecture_id: null });
                  setRegions([]);
                  setDepartements([]);
                  setSousPrefectures([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Région *</Label>
              <Select
                value={formData.region_id}
                onValueChange={(value) => {
                  updateFormData({ region_id: value, departement_id: null, sous_prefecture_id: null });
                  setDepartements([]);
                  setSousPrefectures([]);
                }}
                disabled={!formData.district_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une région" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departement">Département *</Label>
              <Select
                value={formData.departement_id}
                onValueChange={(value) => {
                  updateFormData({ departement_id: value, sous_prefecture_id: null });
                  setSousPrefectures([]);
                }}
                disabled={!formData.region_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un département" />
                </SelectTrigger>
                <SelectContent>
                  {departements.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sous_prefecture">Sous-préfecture *</Label>
              <Select
                value={formData.sous_prefecture_id}
                onValueChange={(value) => updateFormData({ sous_prefecture_id: value })}
                disabled={!formData.departement_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une sous-préfecture" />
                </SelectTrigger>
                <SelectContent>
                  {sousPrefectures.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>{sp.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="village">Village *</Label>
            <Input
              id="village"
              value={formData.village}
              onChange={(e) => updateFormData({ village: e.target.value })}
              placeholder="Ex: Village de Kounahiri"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Superficie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="superficie_ha">Superficie (hectares) *</Label>
            <Input
              id="superficie_ha"
              type="number"
              step="0.5"
              min="1"
              max="50"
              value={formData.superficie_ha}
              onChange={(e) => updateFormData({ superficie_ha: e.target.value })}
              required
            />
          </div>

          {nombrePlants > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                Nombre de plants calculé: <span className="text-lg text-primary">{nombrePlants}</span> plants
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ({formData.superficie_ha} ha × 143 plants/ha)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limites de la parcelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limite_nord">Limite Nord *</Label>
              <Input
                id="limite_nord"
                value={formData.limite_nord}
                onChange={(e) => updateFormData({ limite_nord: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limite_sud">Limite Sud *</Label>
              <Input
                id="limite_sud"
                value={formData.limite_sud}
                onChange={(e) => updateFormData({ limite_sud: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limite_est">Limite Est *</Label>
              <Input
                id="limite_est"
                value={formData.limite_est}
                onChange={(e) => updateFormData({ limite_est: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limite_ouest">Limite Ouest *</Label>
              <Input
                id="limite_ouest"
                value={formData.limite_ouest}
                onChange={(e) => updateFormData({ limite_ouest: e.target.value })}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées GPS (Recommandé)</CardTitle>
          <CardDescription>Cliquez sur la carte pour placer la parcelle (les coordonnées se remplissent automatiquement)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={
            <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Chargement de la carte...</span>
            </div>
          }>
            {isOnline ? (
              <InteractiveMap
                mode="pick"
                position={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null}
                onPositionChange={(lat, lng, alt) => {
                  updateFormData({
                    latitude: lat.toFixed(6),
                    longitude: lng.toFixed(6),
                    altitude: alt?.toFixed(2) || formData.altitude,
                  });
                }}
                height="300px"
              />
            ) : (
              <OfflineMap
                position={formData.latitude && formData.longitude ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null}
                onPositionChange={(lat, lng) => {
                  updateFormData({
                    latitude: lat.toFixed(6),
                    longitude: lng.toFixed(6),
                  });
                }}
                height="300px"
              />
            )}
          </Suspense>

          {(formData.latitude && formData.longitude) && (
            <p className="text-sm text-muted-foreground">
              Position sélectionnée : {formData.latitude}, {formData.longitude}{formData.altitude ? ` (alt: ${formData.altitude}m)` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos de la parcelle (3 obligatoires)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadVisual
            label="Vue générale *"
            field="photo_1_file"
            accept="image/*"
            required
            currentFile={formData.photo_1_file || null}
            currentPreview={formData.photo_1_file_preview || ""}
            onFileChange={handleFileChange}
          />

          <FileUploadVisual
            label="Vue délimitée (limites visibles) *"
            field="photo_2_file"
            accept="image/*"
            required
            currentFile={formData.photo_2_file || null}
            currentPreview={formData.photo_2_file_preview || ""}
            onFileChange={handleFileChange}
          />

          <FileUploadVisual
            label="Vue alternative (autre angle) *"
            field="photo_3_file"
            accept="image/*"
            required
            currentFile={formData.photo_3_file || null}
            currentPreview={formData.photo_3_file_preview || ""}
            onFileChange={handleFileChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};
