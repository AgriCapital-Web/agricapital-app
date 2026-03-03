import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import logoWhite from "@/assets/logo-white.png";
import logoGreen from "@/assets/logo-green.png";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(username, password);
    if (!error) navigate('/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panneau gauche - Branding (caché sur mobile, visible sur desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Pattern décoratif */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-32 right-16 w-64 h-64 rounded-full border-2 border-white/20" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-white/5" />
        </div>
        
        <div className="relative z-10 text-center max-w-md">
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-2xl inline-block">
            <img src={logoGreen} alt="AgriCapital" className="h-28 w-auto mx-auto" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">AgriCapital</h1>
          <p className="text-white/80 text-lg mb-8">
            Plateforme de Gestion des Planteurs & Plantations
          </p>
          
          <div className="flex items-center justify-center gap-8 text-white/70">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-white font-bold">1</div>
              <span className="text-sm">Souscription</span>
            </div>
            <div className="w-8 h-px bg-white/30" />
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-white font-bold">2</div>
              <span className="text-sm">Plantation</span>
            </div>
            <div className="w-8 h-px bg-white/30" />
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-white font-bold">3</div>
              <span className="text-sm">Production</span>
            </div>
          </div>
        </div>
        
        <p className="absolute bottom-6 text-white/50 text-xs">
          © 2025 AgriCapital - Le partenaire idéal des producteurs agricoles
        </p>
      </div>

      {/* Panneau droit - Formulaire de connexion */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-background min-h-screen lg:min-h-0">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8 text-center">
          <div className="bg-primary rounded-2xl p-6 inline-block shadow-lg mb-4">
            <img src={logoWhite} alt="AgriCapital" className="h-16 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-primary">AgriCapital CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestion des Planteurs & Plantations</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Connectez-vous avec votre nom d'utilisateur
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="votre_nom_utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Mot de passe
                </Label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold gap-2"
              disabled={isLoading}
            >
              <LogIn className="h-4 w-4" />
              {isLoading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => navigate('/account-request')}
              className="text-primary text-sm gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Demander la création d'un compte
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Support: <a href="tel:+2250759566087" className="text-primary hover:underline font-medium">+225 07 59 56 60 87</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
