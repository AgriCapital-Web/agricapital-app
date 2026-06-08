import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Percent } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Promotions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

  const [formData, setFormData] = useState({
    nom: "",
    pourcentage_reduction: "30",
    date_debut: "",
    date_fin: "",
    description: "",
    applique_toutes_offres: true,
    type_promotion: "depot_initial" as string,
    cible: "depot_initial" as string,
  });

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const promoData = {
        nom: data.nom,
        pourcentage_reduction: parseInt(data.pourcentage_reduction),
        date_debut: new Date(data.date_debut).toISOString(),
        date_fin: new Date(data.date_fin).toISOString(),
        description: data.description,
        active: true,
        applique_toutes_offres: data.applique_toutes_offres,
        type_promotion: data.cible === "total_contrat" ? "cout_global" : "depot_initial",
        cible: data.cible,
      };

      if (editingPromo) {
        const { error } = await (supabase as any)
          .from('promotions')
          .update(promoData)
          .eq('id', editingPromo.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('promotions')
          .insert([promoData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: "Succès", description: editingPromo ? "Promotion modifiée" : "Promotion créée" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }) => {
      const { error } = await supabase.from('promotions').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: "Succès", description: "Statut modifié" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: "Succès", description: "Promotion supprimée" });
    }
  });

  const resetForm = () => {
    setFormData({
      nom: "",
      pourcentage_reduction: "30",
      date_debut: "",
      date_fin: "",
      description: "",
      applique_toutes_offres: true,
      type_promotion: "depot_initial",
      cible: "depot_initial",
    });
    setEditingPromo(null);
  };

  const handleEdit = (promo: any) => {
    setEditingPromo(promo);
    setFormData({
      nom: promo.nom,
      pourcentage_reduction: promo.pourcentage_reduction.toString(),
      date_debut: format(new Date(promo.date_debut), 'yyyy-MM-dd'),
      date_fin: format(new Date(promo.date_fin), 'yyyy-MM-dd'),
      description: promo.description || "",
      applique_toutes_offres: promo.applique_toutes_offres ?? true,
      type_promotion: promo.type_promotion || "depot_initial",
      cible: promo.cible || (promo.type_promotion === "cout_global" ? "total_contrat" : "depot_initial"),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getStatusBadge = (active: boolean | null) => {
    return active 
      ? <Badge variant="default" className="bg-primary">ACTIF</Badge>
      : <Badge variant="secondary">INACTIF</Badge>;
  };

  const getTypeBadge = (promo: any) => {
    const cible = promo.cible || (promo.type_promotion === "cout_global" ? "total_contrat" : "depot_initial");
    return cible === "total_contrat"
      ? <Badge className="bg-amber-500">Total du Contrat</Badge>
      : <Badge className="bg-blue-500">Dépôt Initial</Badge>;
  };

  const calculateReducedAmount = (percentage: number) => {
    const montantNormal = 30000;
    return montantNormal - (montantNormal * percentage / 100);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Promotions</h1>
          <p className="text-muted-foreground">
            Réductions sur le Dépôt Initial (DA) ou le Coût Global de souscription
          </p>
        </div>
          
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle Promotion</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPromo ? "Modifier la promotion" : "Créer une promotion"}</DialogTitle>
              <DialogDescription>
                Choisissez le type de promotion : sur le dépôt initial (DA) ou sur le coût global.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de la promotion *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Promo Lancement Phase Pilote"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type de promotion *</Label>
                <Select
                  value={formData.cible}
                  onValueChange={(v) => setFormData({...formData, cible: v, type_promotion: v === "total_contrat" ? "cout_global" : "depot_initial"})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="depot_initial">
                      Réduction sur le Dépôt Initial (DA)
                    </SelectItem>
                    <SelectItem value="total_contrat">
                      Réduction sur le Total du Contrat (34 mois)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.cible === "total_contrat" 
                    ? "La réduction s'applique sur le coût total du contrat (DI + 34 mensualités)"
                    : "La réduction s'applique uniquement sur le Dépôt Initial (DI) au moment du paiement"
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pourcentage">Pourcentage de réduction (%) *</Label>
                  <div className="relative">
                    <Input
                      id="pourcentage"
                      type="number"
                      value={formData.pourcentage_reduction}
                      onChange={(e) => setFormData({...formData, pourcentage_reduction: e.target.value})}
                      min="1" max="99" required
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {formData.cible === "depot_initial" && (
                    <p className="text-xs text-muted-foreground">
                      DA réduit: {calculateReducedAmount(parseInt(formData.pourcentage_reduction || "0")).toLocaleString()} F/ha
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Référence</Label>
                  <Input value={formData.cible === "depot_initial" ? "Dépôt Initial selon l'offre" : "Total contrat 34 mois"} disabled />
                  <p className="text-xs text-primary font-medium">
                    Économie: {formData.cible === "depot_initial" 
                      ? `${formData.pourcentage_reduction}% sur le DI`
                      : `${formData.pourcentage_reduction}% sur le total`
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="debut">Date début *</Label>
                  <Input id="debut" type="date" value={formData.date_debut} onChange={(e) => setFormData({...formData, date_debut: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin">Date fin *</Label>
                  <Input id="fin" type="date" value={formData.date_fin} onChange={(e) => setFormData({...formData, date_fin: e.target.value})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des promotions</CardTitle>
          <CardDescription>Gérez les promotions sur le DA (dépôt initial) et sur le coût global.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Chargement...</p>
          ) : promotions && promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo: any) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.nom}</TableCell>
                    <TableCell>{getTypeBadge(promo)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-primary font-bold">{promo.pourcentage_reduction}%</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(promo.date_debut), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(promo.date_fin), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{getStatusBadge(promo.active)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(promo)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleStatusMutation.mutate({ id: promo.id, newStatus: !promo.active })}>
                        {promo.active ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm('Supprimer cette promotion ?')) deleteMutation.mutate(promo.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Aucune promotion configurée.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Promotions;
