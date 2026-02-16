import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, MapPin, Settings2, List, Bell, Globe, Package, UsersRound, UserPlus, Database, Map, Building, Home } from "lucide-react";
import Utilisateurs from "@/pages/Utilisateurs";
import Offres from "@/pages/Offres";
import Equipes from "@/pages/Equipes";
import AccountRequests from "@/pages/AccountRequests";
import GestionRoles from "@/pages/parametres/GestionRoles";
import GestionRegions from "@/pages/parametres/GestionRegions";
import GestionDistricts from "@/pages/parametres/GestionDistricts";
import GestionDepartements from "@/pages/parametres/GestionDepartements";
import GestionSousPrefectures from "@/pages/parametres/GestionSousPrefectures";
import ChampsPersonnalises from "@/pages/parametres/ChampsPersonnalises";
import GestionStatuts from "@/pages/parametres/GestionStatuts";
import ConfigurationSysteme from "@/pages/parametres/ConfigurationSysteme";
import GestionNotifications from "@/pages/parametres/GestionNotifications";
import GestionBaseDonnees from "@/pages/parametres/GestionBaseDonnees";
import { useSearchParams } from "react-router-dom";

const Parametres = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'utilisateurs';

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Configuration et gestion de la plateforme
            </p>
          </div>

          <Tabs defaultValue={defaultTab} className="space-y-4">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex flex-nowrap gap-1 h-auto p-1 bg-muted/50 min-w-max">
                <TabsTrigger value="utilisateurs" className="text-xs sm:text-sm whitespace-nowrap">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Utilisateurs</span>
                  <span className="sm:hidden">Users</span>
                </TabsTrigger>
                <TabsTrigger value="equipes" className="text-xs sm:text-sm whitespace-nowrap">
                  <UsersRound className="h-4 w-4 mr-1" />
                  Équipes
                </TabsTrigger>
                <TabsTrigger value="demandes" className="text-xs sm:text-sm whitespace-nowrap">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Demandes
                </TabsTrigger>
                <TabsTrigger value="offres" className="text-xs sm:text-sm whitespace-nowrap">
                  <Package className="h-4 w-4 mr-1" />
                  Offres
                </TabsTrigger>
                <TabsTrigger value="roles" className="text-xs sm:text-sm whitespace-nowrap">
                  <Shield className="h-4 w-4 mr-1" />
                  Rôles
                </TabsTrigger>
                <TabsTrigger value="districts" className="text-xs sm:text-sm whitespace-nowrap">
                  <Map className="h-4 w-4 mr-1" />
                  Districts
                </TabsTrigger>
                <TabsTrigger value="regions" className="text-xs sm:text-sm whitespace-nowrap">
                  <MapPin className="h-4 w-4 mr-1" />
                  Régions
                </TabsTrigger>
                <TabsTrigger value="departements" className="text-xs sm:text-sm whitespace-nowrap">
                  <Building className="h-4 w-4 mr-1" />
                  Départements
                </TabsTrigger>
                <TabsTrigger value="sous-prefectures" className="text-xs sm:text-sm whitespace-nowrap">
                  <Home className="h-4 w-4 mr-1" />
                  S/Préfectures
                </TabsTrigger>
                <TabsTrigger value="statuts" className="text-xs sm:text-sm whitespace-nowrap">
                  <List className="h-4 w-4 mr-1" />
                  Statuts
                </TabsTrigger>
                <TabsTrigger value="champs" className="text-xs sm:text-sm whitespace-nowrap">
                  <Settings2 className="h-4 w-4 mr-1" />
                  Champs
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs sm:text-sm whitespace-nowrap">
                  <Bell className="h-4 w-4 mr-1" />
                  Notifs
                </TabsTrigger>
                <TabsTrigger value="database" className="text-xs sm:text-sm whitespace-nowrap">
                  <Database className="h-4 w-4 mr-1" />
                  BDD
                </TabsTrigger>
                <TabsTrigger value="systeme" className="text-xs sm:text-sm whitespace-nowrap">
                  <Globe className="h-4 w-4 mr-1" />
                  Système
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="utilisateurs"><Utilisateurs /></TabsContent>
            <TabsContent value="equipes"><Equipes /></TabsContent>
            <TabsContent value="demandes"><AccountRequests /></TabsContent>
            <TabsContent value="offres"><Offres /></TabsContent>
            <TabsContent value="roles"><GestionRoles /></TabsContent>
            <TabsContent value="districts"><GestionDistricts /></TabsContent>
            <TabsContent value="regions"><GestionRegions /></TabsContent>
            <TabsContent value="departements"><GestionDepartements /></TabsContent>
            <TabsContent value="sous-prefectures"><GestionSousPrefectures /></TabsContent>
            <TabsContent value="champs"><ChampsPersonnalises /></TabsContent>
            <TabsContent value="statuts"><GestionStatuts /></TabsContent>
            <TabsContent value="notifications"><GestionNotifications /></TabsContent>
            <TabsContent value="database"><GestionBaseDonnees /></TabsContent>
            <TabsContent value="systeme"><ConfigurationSysteme /></TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Parametres;
