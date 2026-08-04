import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadVisual } from "@/components/ui/file-upload-visual";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Etape5Props {
  formData: any;
  updateFormData: (data: any) => void;
}

export const ANNEXES_SOUSCRIPTION = [
  { field: "annexe1_plan_bloc", label: "Annexe 1 — Plan du bloc / zone de plantation" },
  { field: "annexe2_carto_lot", label: "Annexe 2 — Plan cartographique du lot Hxx (GPS)" },
  { field: "annexe3_piece_souscripteur", label: "Annexe 3 — Pièce d'identité du souscripteur" },
  { field: "annexe4_piece_cotitulaire", label: "Annexe 4 — Pièce d'identité du co-titulaire" },
  { field: "annexe5_procuration", label: "Annexe 5 — Procuration / mandat (si applicable)" },
  { field: "annexe6_recu_versement", label: "Annexe 6 — Reçu du premier versement" },
  { field: "annexe7_calendrier", label: "Annexe 7 — Échéancier de versements signé" },
];

export const Etape5Documents = ({ formData, updateFormData }: Etape5Props) => {
  const handleFileChange = (field: string, file: File | null, preview: string) => {
    updateFormData({
      [`${field}_file`]: file,
      [`${field}_preview`]: preview,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contrat de souscription</CardTitle>
          <CardDescription>Contrat signé (AGC-SUB-YYYY-SPxxx-NNNN) + date de signature</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FileUploadVisual
              label="Contrat de Souscription (Signé) *"
              field="contrat"
              accept=".pdf,image/*"
              required
              currentFile={formData.contrat_file || null}
              currentPreview={formData.contrat_preview || ""}
              onFileChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Formats acceptés: PDF, JPEG, PNG. Max 10MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_signature">Date de signature du contrat *</Label>
            <Input
              id="date_signature"
              type="date"
              value={formData.date_signature_contrat}
              onChange={(e) => updateFormData({ date_signature_contrat: e.target.value })}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annexes du contrat V1</CardTitle>
          <CardDescription>
            Indiquez pour chaque annexe si elle est jointe maintenant ou sera fournie plus tard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ANNEXES_SOUSCRIPTION.map((a) => (
            <div key={a.field} className="space-y-3 rounded-md border p-3">
              <Label>{a.label}</Label>
              <RadioGroup
                value={formData[`${a.field}_status`] || "plus_tard"}
                onValueChange={(status) => updateFormData({ [`${a.field}_status`]: status })}
                className="flex gap-5"
              >
                <div className="flex items-center gap-2"><RadioGroupItem value="joint" id={`${a.field}-joint`} /><Label htmlFor={`${a.field}-joint`}>Joint</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="plus_tard" id={`${a.field}-later`} /><Label htmlFor={`${a.field}-later`}>À fournir plus tard</Label></div>
              </RadioGroup>
              {(formData[`${a.field}_status`] || "plus_tard") === "joint" && <FileUploadVisual
                label="Fichier *"
                field={a.field}
                accept=".pdf,image/*"
                required
                currentFile={formData[`${a.field}_file`] || null}
                currentPreview={formData[`${a.field}_preview`] || ""}
                onFileChange={handleFileChange}
              />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents complémentaires (optionnel)</CardTitle>
          <CardDescription>Autres documents (PV de délimitation, photos, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="docs_complementaires">Autres documents</Label>
            <Input
              id="docs_complementaires"
              type="file"
              multiple
              accept=".pdf,image/jpeg,image/png"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) updateFormData({ docs_complementaires_files: files });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Maximum 5 fichiers. Formats: PDF, JPEG, PNG.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
