import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, Users, Plus, Edit, MoreHorizontal, CheckCircle, XCircle, UserPlus, UserMinus } from "lucide-react";

const Equipes = () => {
  const [equipes, setEquipes] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedEquipe, setSelectedEquipe] = useState<any>(null);
  const [membersEquipe, setMembersEquipe] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom: "",
    responsable_id: "",
    region_id: "",
    actif: true,
  });

  const fetchData = async () => {
    try {
      const { data: equipesData, error: equipesError } = await (supabase as any)
        .from("equipes")
        .select(`
          *,
          responsable:profiles!equipes_responsable_id_fkey(nom_complet, telephone),
          region:regions(nom)
        `)
        .order("created_at", { ascending: false });

      const { data: regionsData } = await (supabase as any)
        .from("regions")
        .select("*")
        .order("nom");

      const { data: profilesData } = await (supabase as any)
        .from("profiles")
        .select("id, nom_complet, user_id")
        .order("nom_complet");

      if (equipesError) throw equipesError;

      setEquipes(equipesData || []);
      setRegions(regionsData || []);
      setProfiles(profilesData || []);
      setAllProfiles(profilesData || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useRealtime({ table: "equipes", onChange: fetchData });

  const fetchMembers = async (equipe: any) => {
    setMembersEquipe(equipe);
    
    // Get profiles assigned to this team
    const { data: teamMembers } = await (supabase as any)
      .from("profiles")
      .select("id, nom_complet, telephone, user_id")
      .eq("equipe_id", equipe.id);
    
    // Get roles for these members
    const membersList = await Promise.all(
      (teamMembers || []).map(async (m: any) => {
        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", m.user_id);
        return { ...m, roles: roles?.map((r: any) => r.role) || [] };
      })
    );
    
    setMembers(membersList);
    
    // Available = profiles not in any team + have commercial/chef_equipe role
    const { data: available } = await (supabase as any)
      .from("profiles")
      .select("id, nom_complet, user_id")
      .is("equipe_id", null)
      .neq("id", equipe.responsable_id || "");
    
    const availableWithRoles = await Promise.all(
      (available || []).map(async (p: any) => {
        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", p.user_id);
        const rolesList = roles?.map((r: any) => r.role) || [];
        return { ...p, roles: rolesList };
      })
    );
    
    // Only show commercial and chef_equipe
    setAvailableMembers(
      availableWithRoles.filter(p => 
        p.roles.includes("commercial") || p.roles.includes("chef_equipe")
      )
    );
    
    setIsMembersOpen(true);
  };

  const addMember = async () => {
    if (!selectedMemberId || !membersEquipe) return;
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ equipe_id: membersEquipe.id })
        .eq("id", selectedMemberId);
      
      if (error) throw error;
      toast({ title: "Membre ajouté", description: "Le commercial a été assigné à l'équipe" });
      setSelectedMemberId("");
      fetchMembers(membersEquipe);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const removeMember = async (profileId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ equipe_id: null })
        .eq("id", profileId);
      
      if (error) throw error;
      toast({ title: "Membre retiré", description: "Le commercial a été retiré de l'équipe" });
      if (membersEquipe) fetchMembers(membersEquipe);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEquipe) {
        const { error } = await (supabase as any).from("equipes").update(formData).eq("id", selectedEquipe.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Équipe modifiée" });
      } else {
        const { error } = await (supabase as any).from("equipes").insert([formData]);
        if (error) throw error;
        toast({ title: "Succès", description: "Équipe créée" });
      }
      setIsFormOpen(false);
      setSelectedEquipe(null);
      setFormData({ nom: "", responsable_id: "", region_id: "", actif: true });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const handleEdit = (equipe: any) => {
    setSelectedEquipe(equipe);
    setFormData({
      nom: equipe.nom,
      responsable_id: equipe.responsable_id || "",
      region_id: equipe.region_id || "",
      actif: equipe.actif ?? true,
    });
    setIsFormOpen(true);
  };

  const handleStatusChange = async (equipeId: string, newStatus: boolean) => {
    try {
      const { error } = await (supabase as any).from("equipes").update({ actif: newStatus }).eq("id", equipeId);
      if (error) throw error;
      toast({ title: "Succès", description: `Équipe ${newStatus ? "activée" : "désactivée"}` });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const ROLE_SHORT: Record<string, string> = {
    commercial: "Commercial",
    chef_equipe: "CE",
    responsable_zone: "RCom",
  };

  const filteredEquipes = equipes.filter((e) =>
    e.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.responsable?.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.region?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestion des Équipes</h1>
          <p className="text-muted-foreground mt-1">{equipes.length} équipe(s)</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedEquipe(null);
              setFormData({ nom: "", responsable_id: "", region_id: "", actif: true });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Équipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEquipe ? "Modifier l'équipe" : "Nouvelle équipe"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nom de l'équipe</Label>
                <Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
              </div>
              <div>
                <Label>Chef d'équipe</Label>
                <Select value={formData.responsable_id} onValueChange={(v) => setFormData({ ...formData, responsable_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nom_complet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Région</Label>
                <Select value={formData.region_id} onValueChange={(v) => setFormData({ ...formData, region_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit">{selectedEquipe ? "Modifier" : "Créer"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{equipes.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <div>
              <div className="text-2xl font-bold">{equipes.filter(e => e.actif).length}</div>
              <div className="text-sm text-muted-foreground">Actives</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Équipe</TableHead>
              <TableHead>Chef d'équipe</TableHead>
              <TableHead className="hidden sm:table-cell">Région</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : filteredEquipes.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Aucune équipe</TableCell></TableRow>
            ) : (
              filteredEquipes.map((equipe) => (
                <TableRow key={equipe.id}>
                  <TableCell className="font-medium">{equipe.nom}</TableCell>
                  <TableCell>{equipe.responsable?.nom_complet || "Non assigné"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{equipe.region?.nom || "-"}</TableCell>
                  <TableCell>
                    <Badge className={equipe.actif ? "bg-green-500" : "bg-red-500"}>
                      {equipe.actif ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => fetchMembers(equipe)}>
                          <Users className="h-4 w-4 mr-2" />Gérer les membres
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(equipe)}>
                          <Edit className="h-4 w-4 mr-2" />Modifier
                        </DropdownMenuItem>
                        {equipe.actif ? (
                          <DropdownMenuItem onClick={() => handleStatusChange(equipe.id, false)} className="text-orange-600">
                            <XCircle className="h-4 w-4 mr-2" />Désactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleStatusChange(equipe.id, true)} className="text-green-600">
                            <CheckCircle className="h-4 w-4 mr-2" />Activer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Members Dialog */}
      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Membres — {membersEquipe?.nom}</DialogTitle>
          </DialogHeader>
          
          {/* Add member */}
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Ajouter un commercial..." /></SelectTrigger>
              <SelectContent>
                {availableMembers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom_complet} ({p.roles.map((r: string) => ROLE_SHORT[r] || r).join(", ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMember} disabled={!selectedMemberId} size="sm">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Members list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun membre dans cette équipe</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{m.nom_complet}</p>
                    <div className="flex gap-1 mt-1">
                      {m.roles.map((r: string) => (
                        <Badge key={r} variant="secondary" className="text-xs">
                          {ROLE_SHORT[r] || r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)} className="text-destructive">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Equipes;
