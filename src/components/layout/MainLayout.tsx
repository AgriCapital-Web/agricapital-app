import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AIAssistant from "@/components/ai/AIAssistant";
import logoWhite from "@/assets/logo-white.png";
import { cn } from "@/lib/utils";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { 
  LayoutDashboard, Users, Sprout, CreditCard, LogOut, Menu, Receipt,
  BarChart3, Ticket, Wallet, FileText, Settings, UserCircle, Wifi, WifiOff, RefreshCw, Signal
} from "lucide-react";

interface MainLayoutProps { children: ReactNode; }

const MainLayout = ({ children }: MainLayoutProps) => {
  const { signOut, profile, userRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { isOnline, isSyncing, syncNow, pendingCount, networkQuality } = useOfflineSync();

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

  const NetworkIndicator = ({ compact = false }: { compact?: boolean }) => {
    if (!isOnline) return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <WifiOff className="h-3 w-3" /> {!compact && 'Hors ligne'}
      </span>
    );
    if (networkQuality === 'slow') return (
      <span className="flex items-center gap-1 text-xs text-yellow-600">
        <Signal className="h-3 w-3" /> {!compact && 'Réseau lent'}
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Wifi className="h-3 w-3" /> {!compact && 'En ligne'}
      </span>
    );
  };

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
        {/* Offline status in sidebar */}
        {expanded && (
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-1.5">
              {!isOnline ? <WifiOff className="h-3 w-3 text-red-300" /> : networkQuality === 'slow' ? <Signal className="h-3 w-3 text-yellow-300" /> : <Wifi className="h-3 w-3 text-green-300" />}
              <span className="text-[10px] text-primary-foreground/70">
                {!isOnline ? 'Hors ligne' : networkQuality === 'slow' ? 'Lent' : 'En ligne'}
              </span>
            </div>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-yellow-500/20 text-yellow-200 border-0">
                {pendingCount} en attente
              </Badge>
            )}
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <NetworkIndicator compact />
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-yellow-500 text-yellow-600">
                {pendingCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={syncNow} disabled={isSyncing || !isOnline}>
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
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
            <NetworkIndicator />
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-yellow-500 text-yellow-600">
                {pendingCount} modification(s) en attente
              </Badge>
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
