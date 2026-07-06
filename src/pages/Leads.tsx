import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { offlineInsert, offlineUpdate } from "@/lib/offlineWrite";
import { getCachedItems, STORES } from "@/lib/offlineDb";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Target, TrendingUp, Users, MapPin, PhoneCall, ArrowRight, Copy } from "lucide-react";

const STATUTS = [
  { v: "nouveau", l: "Nouveau", color: "bg-blue-100 text-blue-800" },
  { v: "contacte", l: "Contacté", color: "bg-cyan-100 text-cyan-800" },
  { v: "qualifie", l: "Qualifié", color: "bg-indigo-100 text-indigo-800" },
  { v: "en_discussion", l: "En discussion", color: "bg-purple-100 text-purple-800" },
  { v: "preparation_dossier", l: "Prépa dossier", color: "bg-amber-100 text-amber-800" },
  { v: "pret_souscrire", l: "Prêt à souscrire", color: "bg-orange-100 text-orange-800" },
  { v: "converti", l: "Converti", color: "bg-green-100 text-green-800" },
  { v: "abandonne", l: "Abandonné", color: "bg-gray-100 text-gray-800" },
];

const CANAUX = [{ v: "appel", l: "Appel" }, { v: "whatsapp", l: "WhatsApp" }, { v: "physique", l: "Physique" }, { v: "email", l: "Email" }];
const RESULTATS = [
  { v: "non_joignable", l: "Non joignable" }, { v: "rappel_demande", l: "Rappel demandé" },
  { v: "interesse", l: "Intéressé" }, { v: "tres_interesse", l: "Très intéressé" },
  { v: "en_reflexion", l: "En réflexion" }, { v: "non_interesse", l: "Non intéressé" },
];

export default function Leads() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [relance, setRelance] = useState<any>({ canal: "appel", resultat: "interesse", commentaire: "", prochaine_relance: "" });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await getCachedItems(STORES.LEADS);
        return cached.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
      }
      const { data, error } = await (supabase as any).from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: relances = [] } = useQuery({
    queryKey: ["lead_relances", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await getCachedItems(STORES.LEAD_RELANCES);
        return cached.filter((r: any) => r.lead_id === selected.id);
      }
      const { data } = await (supabase as any).from("lead_relances").select("*").eq("lead_id", selected.id).order("date_relance", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, statut }: any) => {
      const { error } = await offlineUpdate("leads", id, { statut });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Statut mis à jour" }); },
  });

  const addRelance = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await offlineInsert("lead_relances", {
        lead_id: selected.id,
        commercial_id: user?.id || null,
        ...relance,
        prochaine_relance: relance.prochaine_relance || null,
      });
      if (error) throw error;
      if (relance.prochaine_relance) {
        await offlineUpdate("leads", selected.id, { prochaine_relance_at: relance.prochaine_relance });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead_relances", selected?.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      setRelanceOpen(false);
      setRelance({ canal: "appel", resultat: "interesse", commentaire: "", prochaine_relance: "" });
      toast({ title: "Relance enregistrée" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  const convertToSouscripteur = (lead: any) => {
    // Pré-remplir souscription via query params
    const params = new URLSearchParams({
      lead_id: lead.id,
      nom: lead.nom || "",
      prenoms: lead.prenoms || "",
      telephone: lead.telephone || "",
      whatsapp: lead.whatsapp || "",
      email: lead.email || "",
      region: lead.region_residence || "",
    });
    navigate(`/nouvelle-souscription?${params.toString()}`);
  };

  const publicUrl = `${window.location.origin}/leads/public`;

  const stats = {
    total: leads.length,
    nouveaux: leads.filter((l: any) => l.statut === "nouveau").length,
    aRelancer: leads.filter((l: any) => l.prochaine_relance_at && new Date(l.prochaine_relance_at) <= new Date()).length,
    convertis: leads.filter((l: any) => l.statut === "converti").length,
    diaspora: leads.filter((l: any) => l.est_diaspora).length,
    superficie: leads.reduce((s: number, l: any) => s + (Number(l.superficie_disponible_ha || l.superficie_souhaitee_ha) || 0), 0),
  };
  const tauxConversion = stats.total ? Math.round((stats.convertis / stats.total) * 100) : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" />Prospects / Leads</h1>
            <p className="text-muted-foreground text-sm">Suivi commercial jusqu'à la conversion en souscripteur.</p>
          </div>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Lien copié", description: publicUrl }); }}>
            <Copy className="h-4 w-4 mr-2" />Lien public
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { l: "Total", v: stats.total, i: Users },
            { l: "Nouveaux", v: stats.nouveaux, i: Target },
            { l: "À relancer", v: stats.aRelancer, i: PhoneCall },
            { l: "Convertis", v: stats.convertis, i: TrendingUp },
            { l: "Diaspora", v: stats.diaspora, i: MapPin },
            { l: "Taux conv.", v: `${tauxConversion}%`, i: TrendingUp },
          ].map((s, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.l}</p><p className="text-xl font-bold">{s.v}</p></div>
                <s.i className="h-5 w-5 text-primary/60" />
              </div>
            </CardContent></Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Pipeline commercial</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>ID</TableHead><TableHead>Nom</TableHead><TableHead>Contact</TableHead>
                <TableHead>Région</TableHead><TableHead>Statut</TableHead><TableHead>Relance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leads.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun prospect enregistré.</TableCell></TableRow>}
                {leads.map((l: any) => {
                  const st = STATUTS.find(s => s.v === l.statut);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.id_unique}</TableCell>
                      <TableCell><div className="font-medium">{l.nom} {l.prenoms}</div>{l.est_diaspora && <Badge variant="outline" className="text-xs mt-1">Diaspora</Badge>}</TableCell>
                      <TableCell className="text-sm">{l.telephone}<br/><span className="text-xs text-muted-foreground">{l.email || "—"}</span></TableCell>
                      <TableCell className="text-sm">{l.region_residence}</TableCell>
                      <TableCell>
                        <Select value={l.statut} onValueChange={v => updateStatus.mutate({ id: l.id, statut: v })}>
                          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUTS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{l.prochaine_relance_at ? format(new Date(l.prochaine_relance_at), "dd MMM", { locale: fr }) : "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setSelected(l)}>Détails</Button>
                        {l.statut !== "converti" && (
                          <Button size="sm" onClick={() => convertToSouscripteur(l)}><ArrowRight className="h-3 w-3 mr-1" />Convertir</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader><DialogTitle>{selected.nom} {selected.prenoms} — {selected.id_unique}</DialogTitle></DialogHeader>
                <Tabs defaultValue="info">
                  <TabsList><TabsTrigger value="info">Informations</TabsTrigger><TabsTrigger value="relances">Relances ({relances.length})</TabsTrigger></TabsList>
                  <TabsContent value="info" className="space-y-2 text-sm">
                    <p><b>Téléphone:</b> {selected.telephone} • <b>WhatsApp:</b> {selected.whatsapp || "—"}</p>
                    <p><b>Email:</b> {selected.email || "—"}</p>
                    <p><b>Région:</b> {selected.region_residence} {selected.est_diaspora && `(Diaspora: ${selected.pays_diaspora || "?"})`}</p>
                    <p><b>Terrain:</b> {selected.dispose_terrain ? `Oui — ${selected.superficie_disponible_ha || 0} ha dispo, ${selected.superficie_a_valoriser_ha || 0} ha à valoriser` : `Non — souhaite ${selected.superficie_souhaitee_ha || 0} ha`}</p>
                    <p><b>Délai:</b> {selected.delai_demarrage || "—"} • <b>Créneau:</b> {selected.creneau_prefere || "—"} • <b>Mode:</b> {selected.mode_contact_prefere}</p>
                    <p><b>Source:</b> {selected.source}</p>
                    <p><b>Message:</b> {selected.commentaire || "—"}</p>
                  </TabsContent>
                  <TabsContent value="relances" className="space-y-3">
                    <Button size="sm" onClick={() => setRelanceOpen(true)}>+ Nouvelle relance</Button>
                    {relances.map((r: any) => (
                      <Card key={r.id}><CardContent className="p-3 text-sm">
                        <div className="flex justify-between"><b>{CANAUX.find(c=>c.v===r.canal)?.l}</b><span className="text-xs text-muted-foreground">{format(new Date(r.date_relance),"dd/MM HH:mm",{locale:fr})}</span></div>
                        <Badge className="mt-1">{RESULTATS.find(x=>x.v===r.resultat)?.l}</Badge>
                        <p className="mt-2">{r.commentaire}</p>
                        {r.prochaine_relance && <p className="text-xs text-muted-foreground mt-1">Prochaine: {format(new Date(r.prochaine_relance),"dd/MM/yyyy")}</p>}
                      </CardContent></Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={relanceOpen} onOpenChange={setRelanceOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle relance</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Canal</Label><Select value={relance.canal} onValueChange={v=>setRelance({...relance,canal:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CANAUX.map(c=><SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Résultat</Label><Select value={relance.resultat} onValueChange={v=>setRelance({...relance,resultat:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RESULTATS.map(r=><SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Commentaire</Label><Textarea value={relance.commentaire} onChange={e=>setRelance({...relance,commentaire:e.target.value})} /></div>
              <div><Label>Prochaine relance</Label><Input type="date" value={relance.prochaine_relance} onChange={e=>setRelance({...relance,prochaine_relance:e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={()=>addRelance.mutate()} disabled={addRelance.isPending}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}