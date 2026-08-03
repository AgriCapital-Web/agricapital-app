import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoGreen from "@/assets/logo-green.png";
import { User, Mail, Phone, Briefcase, MapPin, FileText, KeyRound, AtSign } from "lucide-react";

const ROLES = [
  { value: "commercial", label: "Commercial (Comm)" },
  { value: "technicien", label: "Technicien (Tech)" },
  { value: "chef_equipe_commercial", label: "Chef d'Équipe Commercial (CEC)" },
  { value: "chef_equipe_technique", label: "Chef d'Équipe Technique (CET)" },
  { value: "responsable_commercial", label: "Responsable Commercial (RCom)" },
  { value: "responsable_technique_agronomique", label: "Responsable Technique & Agronomique (RTA)" },
  { value: "responsable_zone", label: "Responsable de zone" },
  { value: "comptable", label: "Comptable" },
  { value: "service_client", label: "Service client / Support" },
  { value: "operations", label: "Opérations" }
];

const AccountRequest = () => {
  const [formData, setFormData] = useState({
    nom_complet: "",
    email: "",
    telephone: "",
    poste: "",
    region: "",
    departement: "",
    district: "",
    message: "",
    username: "",
    password: "",
    password_confirm: "",
  });
  const [ownerInfo, setOwnerInfo] = useState<any>(null);
  
  const [regions, setRegions] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      const { data } = await (supabase as any)
        .from('districts')
        .select('*')
        .eq('est_actif', true)
        .order('nom');
      setDistricts(data || []);
    };
    fetchDistricts();
  }, []);

  // Fetch regions when district changes
  useEffect(() => {
    const fetchRegions = async () => {
      if (formData.district) {
        const { data } = await (supabase as any)
          .from('regions')
          .select('*')
          .eq('district_id', formData.district)
          .eq('est_active', true)
          .order('nom');
        setRegions(data || []);
        setFormData(prev => ({ ...prev, region: "", departement: "" }));
        setDepartements([]);
      } else {
        setRegions([]);
      }
    };
    fetchRegions();
  }, [formData.district]);

  // Fetch departements when region changes
  useEffect(() => {
    const fetchDepartements = async () => {
      if (formData.region) {
        const { data } = await (supabase as any)
          .from('departements')
          .select('*')
          .eq('region_id', formData.region)
          .eq('est_actif', true)
          .order('nom');
        setDepartements(data || []);
        setFormData(prev => ({ ...prev, departement: "" }));
      } else {
        setDepartements([]);
      }
    };
    fetchDepartements();
  }, [formData.region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Get region/department/district names for storage
      const regionName = regions.find(r => r.id === formData.region)?.nom || "";
      const deptName = departements.find(d => d.id === formData.departement)?.nom || "";

      // Create account request
      const { error } = await (supabase as any)
        .from('account_requests')
        .insert({
          nom_complet: formData.nom_complet,
          email: formData.email,
          telephone: formData.telephone,
          poste_souhaite: ROLES.find((role) => role.value === formData.poste)?.label || formData.poste,
          role_souhaite: formData.poste,
          region_id: formData.region || null,
          departement_geo_id: formData.departement || null,
          district_id: formData.district || null,
          departement: deptName || null,
          justification: formData.message || null,
          photo_url: null,
          cv_url: null,
          statut: 'en_attente',
        });

      if (error) throw error;

      // Try to send notification (non-blocking)
      try {
        await supabase.functions.invoke('send-account-request-notification', {
          body: { requestData: { ...formData, region: regionName, departement: deptName } }
        });
      } catch (notifError) {
        console.log('Notification error (non-blocking):', notifError);
      }

      toast({
        title: "Demande envoyée",
        description: "Votre demande sera examinée par l'administrateur.",
      });

      navigate('/login');
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary-hover p-3 sm:p-4">
      <Card className="w-full max-w-[95%] sm:max-w-2xl shadow-strong my-4">
        <CardHeader className="text-center px-4 sm:px-6 pb-4">
          <div className="flex justify-center mb-2 sm:mb-4">
            <img src={logoGreen} alt="AgriCapital Logo" className="h-16 sm:h-24 w-auto" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Demande de Création de Compte</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Remplissez ce formulaire pour demander un accès à AgriCapital
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Informations personnelles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nom_complet" className="text-sm flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Nom complet *
                </Label>
                <Input
                  id="nom_complet"
                  required
                  className="h-10"
                  value={formData.nom_complet}
                  onChange={(e) => setFormData({...formData, nom_complet: e.target.value})}
                  placeholder="Ex: KOUASSI Jean"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="h-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="votre@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telephone" className="text-sm flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" /> Téléphone *
                </Label>
                <Input
                  id="telephone"
                  type="tel"
                  required
                  className="h-10"
                  value={formData.telephone}
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                  placeholder="07 XX XX XX XX"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="poste" className="text-sm flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5" /> Poste souhaité *
                </Label>
                <Select
                  value={formData.poste}
                  onValueChange={(value) => setFormData({...formData, poste: value})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Localisation */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Localisation
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  value={formData.district}
                  onValueChange={(value) => setFormData({...formData, district: value})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="District" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(dist => (
                      <SelectItem key={dist.id} value={dist.id}>
                        {dist.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({...formData, region: value})}
                  disabled={!formData.district}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Région" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.departement}
                  onValueChange={(value) => setFormData({...formData, departement: value})}
                  disabled={!formData.region}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    {departements.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message / Justification */}
            <div className="space-y-1.5">
              <Label htmlFor="message" className="text-sm flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" /> Message / Justification
              </Label>
              <Textarea
                id="message"
                rows={3}
                className="text-sm"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Expliquez pourquoi vous souhaitez rejoindre AgriCapital..."
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Après validation par l'administrateur, un mot de passe temporaire vous sera transmis en privé. Vous pourrez le changer à votre première connexion.
            </p>

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/login')}
                className="flex-1 h-10 sm:h-11"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 sm:h-11"
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountRequest;
