import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Users, MapPin, Layers } from "lucide-react";
import { useUserZones } from "@/hooks/useUserZones";

const ProprietairesTerres = () => {
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [sousPrefectures, setSousPrefectures] = useState<any[]>([]);
  const { toast } = useToast();
  const { fetchFilteredDistricts, fetchFilteredRegions, fetchFilteredDepartements, fetchFilteredSousPrefectures } = useUserZones();

  const [formData, setFormData] = useState({
    civilite: "", nom: "", prenoms: "", date_naissance: "", lieu_naissance: "",
    telephone: "", whatsapp: "", email: "", type_piece: "", numero_piece: "",
    date_delivrance_piece: "", domicile: "", district_id: "", region_id: "",
    departement_id: "", sous_prefecture_id: "", village: "",
  });

  const fetchData = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("proprietaires_terres")
        .select("*, districts(nom), regions(nom), departements(nom), sous_prefectures(nom)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProprietaires(data || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); loadDistricts(); }, []);

  const loadDistricts = async () => { setDistricts(await fetchFilteredDistricts()); };

  const handleDistrictChange = async (v: string) => {
    setFormData(f => ({ ...f, district_id: v, region_id: "", departement_id: "", sous_prefecture_id: "" }));
    setRegions(await fetchFilteredRegions(v));
    setDepartements([]); setSousPrefectures([]);
  };
  const handleRegionChange = async (v: string) => {
    setFormData(f => ({ ...f, region_id: v, departement_id: "", sous_prefecture_id: "" }));
    setDepartements(await fetchFilteredDepartements(v));
    setSousPrefectures([]);
  };
  const handleDeptChange = async (v: string) => {
    setFormData(f => ({ ...f, departement_id: v, sous_prefecture_id: "" }));
    setSousPrefectures(await fetchFilteredSousPrefectures(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: genId } = await (supabase as any).rpc("generate_proprietaire_id");
      const nomComplet = `${formData.nom} ${formData.prenoms}`.trim();
      const { error } = await (supabase as any).from("proprietaires_terres").insert({
        ...formData, id_unique: genId, nom_complet: nomComplet,
        district_id: formData.district_id || null, region_id: formData.region_id || null,
        departement_id: formData.departement_id || null, sous_prefecture_id: formData.sous_prefecture_id || null,
      });
      if (error) throw error;
      toast({ title: "Succès", description: `Propriétaire ${genId} enregistré` });
      setIsFormOpen(false);
      setFormData({ civilite: "", nom: "", prenoms: "", date_naissance: "", lieu_naissance: "", telephone: "", whatsapp: "", email: "", type_piece: "", numero_piece: "", date_delivrance_piece: "", domicile: "", district_id: "", region_id: "", departement_id: "", sous_prefecture_id: "", village: "" });
      fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  const filtered = proprietaires.filter(p =>
    p.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id_unique?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telephone?.includes(searchTerm)
  );

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SOUSCRIPTIONS}>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Propriétaires de Terres</h1>
              <p className="text-muted-foreground mt-1">{proprietaires.length} propriétaire(s)</p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Nouveau Propriétaire</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Enregistrer un Propriétaire de Terre</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Civilité *</Label>
                      <Select value={formData.civilite} onValueChange={v => setFormData(f => ({ ...f, civilite: v }))}>
                        <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">M.</SelectItem>
                          <SelectItem value="Mme">Mme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input value={formData.nom} onChange={e => setFormData(f => ({ ...f, nom: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Prénoms</Label>
                      <Input value={formData.prenoms} onChange={e => setFormData(f => ({ ...f, prenoms: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone *</Label>
                      <Input value={formData.telephone} onChange={e => setFormData(f => ({ ...f, telephone: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input value={formData.whatsapp} onChange={e => setFormData(f => ({ ...f, whatsapp: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Type pièce</Label>
                      <Select value={formData.type_piece} onValueChange={v => setFormData(f => ({ ...f, type_piece: v }))}>
                        <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cni">CNI</SelectItem>
                          <SelectItem value="passeport">Passeport</SelectItem>
                          <SelectItem value="attestation">Attestation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>N° Pièce</Label>
                      <Input value={formData.numero_piece} onChange={e => setFormData(f => ({ ...f, numero_piece: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date délivrance</Label>
                      <Input type="date" value={formData.date_delivrance_piece} onChange={e => setFormData(f => ({ ...f, date_delivrance_piece: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>District</Label>
                      <Select value={formData.district_id} onValueChange={handleDistrictChange}>
                        <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
                        <SelectContent>{districts.map(d => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Région</Label>
                      <Select value={formData.region_id} onValueChange={handleRegionChange} disabled={!formData.district_id}>
                        <SelectTrigger><SelectValue placeholder="Région" /></SelectTrigger>
                        <SelectContent>{regions.map(r => <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Département</Label>
                      <Select value={formData.departement_id} onValueChange={handleDeptChange} disabled={!formData.region_id}>
                        <SelectTrigger><SelectValue placeholder="Département" /></SelectTrigger>
                        <SelectContent>{departements.map(d => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sous-préfecture</Label>
                      <Select value={formData.sous_prefecture_id} onValueChange={v => setFormData(f => ({ ...f, sous_prefecture_id: v }))} disabled={!formData.departement_id}>
                        <SelectTrigger><SelectValue placeholder="S/Préfecture" /></SelectTrigger>
                        <SelectContent>{sousPrefectures.map(sp => <SelectItem key={sp.id} value={sp.id}>{sp.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Village</Label>
                    <Input value={formData.village} onChange={e => setFormData(f => ({ ...f, village: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                    <Button type="submit">Enregistrer</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
                <div><div className="text-2xl font-bold">{proprietaires.length}</div><div className="text-xs text-muted-foreground">Propriétaires</div></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg"><Layers className="h-5 w-5 text-accent" /></div>
                <div><div className="text-2xl font-bold">{proprietaires.reduce((s, p) => s + (p.nombre_parcelles || 0), 0)}</div><div className="text-xs text-muted-foreground">Parcelles</div></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><MapPin className="h-5 w-5 text-green-600" /></div>
                <div><div className="text-2xl font-bold">{proprietaires.reduce((s, p) => s + (p.surface_totale_ha || 0), 0).toFixed(1)}</div><div className="text-xs text-muted-foreground">ha total</div></div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom Complet</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Parcelles</TableHead>
                  <TableHead>Surface (ha)</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Chargement...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Aucun propriétaire</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id_unique}</TableCell>
                    <TableCell className="font-medium">{p.nom_complet}</TableCell>
                    <TableCell>{p.telephone}</TableCell>
                    <TableCell className="text-xs">{[p.districts?.nom, p.regions?.nom, p.departements?.nom].filter(Boolean).join(" > ") || "-"}</TableCell>
                    <TableCell>{p.nombre_parcelles || 0}</TableCell>
                    <TableCell>{(p.surface_totale_ha || 0).toFixed(1)}</TableCell>
                    <TableCell><Badge className={p.statut === "actif" ? "bg-green-500" : "bg-red-500"}>{p.statut}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default ProprietairesTerres;
