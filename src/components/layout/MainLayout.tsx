import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AIAssistant from "@/components/ai/AIAssistant";
import logoWhite from "@/assets/logo-white.png";
import { cn } from "@/lib/utils";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { 
  LayoutDashboard, Users, Sprout, CreditCard, LogOut, Menu, Receipt,
  BarChart3, Ticket, Wallet, FileText, Settings, UserCircle, Wifi, WifiOff, RefreshCw
} from "lucide-react";

interface MainLayoutProps { children: ReactNode; }

const MainLayout = ({ children }: MainLayoutProps) => {
  const { signOut, profile, userRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { isOnline, isSyncing, syncNow } = useOfflineSync();

  const menuItems = [
    { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard", permission: PERMISSIONS.VIEW_DASHBOARD },
    { icon: Users, label: "Souscripteurs", path: "/souscriptions", permission: PERMISSIONS.VIEW_SOUSCRIPTIONS },
    { icon: Sprout, label: "Plantations", path: "/plantations", permission: PERMISSIONS.VIEW_PLANTATIONS },
    { icon: CreditCard, label: "Gestion Paiements", path: "/paiements", permission: PERMISSIONS.VIEW_PAIEMENTS },
    { icon: Receipt, label: "Commissions", path: "/commissions", permission: PERMISSIONS.VIEW_COMMISSIONS },
    { icon: Wallet, label: "Portefeuilles", path: "/portefeuilles", permission: PERMISSIONS.VIEW_PORTEFEUILLES },
    { icon: BarChart3, label: "Rapports Techniques", path: "/rapports-techniques", permission: PERMISSIONS.VIEW_RAPPORTS_TECHNIQUES },
    { icon: FileText, label: "Rapports Financiers", path: "/rapports-financiers", permission: PERMISSIONS.VIEW_RAPPORTS_FINANCIERS },
    { icon: Ticket, label: "Tickets Support", path: "/tickets", permission: PERMISSIONS.VIEW_TICKETS },
    { icon: Settings, label: "Paramètres", path: "/parametres", permission: PERMISSIONS.VIEW_PARAMETRES },
  ];

  const visibleMenuItems = menuItems.filter(item => hasPermission(userRoles, item.permission));

  const handleLogout = async () => { await signOut(); navigate("/"); };
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'US';

  const SidebarContent = ({ expanded = false }: { expanded?: boolean }) => (
    <div className="flex flex-col h-full bg-primary">
      <div className="p-3 sm:p-4 border-b border-white/10 flex justify-center">
        <img src={logoWhite} alt="AgriCapital" className="h-10 sm:h-12 lg:h-16 w-auto object-contain" />
      </div>
      
      <nav className="flex-1 p-2 sm:p-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground transition-all",
              "focus:bg-primary-foreground/20 p-2 sm:p-3",
              expanded ? "justify-start gap-3" : "justify-center",
              location.pathname === item.path && "bg-primary-foreground/20"
            )}
            onClick={() => { navigate(item.path); setOpen(false); }}
            title={item.label}
          >
            <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {expanded && <span className="text-sm truncate">{item.label}</span>}
          </Button>
        ))}
      </nav>

      <div className="p-2 sm:p-4 border-t border-white/10 flex flex-col gap-2">
        <NotificationCenter />
        <Button
          variant="ghost"
          className={cn(
            "w-full text-primary-foreground hover:bg-primary-foreground/10 transition-all p-2 sm:p-3",
            expanded ? "justify-start gap-3" : "justify-center",
            location.pathname === "/profil" && "bg-primary-foreground/20"
          )}
          onClick={() => { navigate("/profil"); setOpen(false); }}
          title="Mon Profil"
        >
          <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          {expanded && <span className="text-sm">Mon Profil</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-primary-foreground hover:bg-destructive hover:text-white transition-all p-2 sm:p-3",
            expanded ? "justify-start gap-3" : "justify-center"
          )}
          onClick={handleLogout}
          title="Déconnexion"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          {expanded && <span className="text-sm">Déconnexion</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-52 lg:w-60 flex-col flex-shrink-0">
        <SidebarContent expanded />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b px-3 py-2 flex items-center justify-between">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-medium truncate max-w-[120px]">{profile?.nom_complet}</p>
            </div>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate('/profil')}>
              <AvatarImage src={profile?.photo_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile?.nom_complet || '')}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent expanded />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="hidden md:flex items-center justify-end gap-3 px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2 mr-auto">
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="h-3 w-3" /> En ligne</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-destructive"><WifiOff className="h-3 w-3" /> Hors ligne</span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={syncNow} disabled={isSyncing || !isOnline} title="Forcer la synchronisation">
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            </Button>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{profile?.nom_complet || "Utilisateur"}</p>
            <p className="text-xs text-muted-foreground">
              Support: <a href="tel:+2250759566087" className="text-primary hover:underline">+225 07 59 56 60 87</a>
            </p>
          </div>
          <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate('/profil')}>
            <AvatarImage src={profile?.photo_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(profile?.nom_complet || '')}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="p-3 sm:p-4 md:p-6">{children}</div>
      </main>
      
      <AIAssistant mode="admin" context={`Utilisateur: ${profile?.nom_complet || 'Admin'}, Rôles: ${userRoles.join(', ') || 'N/A'}`} />
    </div>
  );
};

export default MainLayout;
