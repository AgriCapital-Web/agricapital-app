import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { cacheAuthCredentials, getCachedAuth, hashPassword } from '@/lib/offlineDb';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  userRoles: string[];
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile and roles
          setTimeout(async () => {
            try {
              const { data: profileData } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              setProfile(profileData);

              const { data: rolesData } = await (supabase as any)
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id);
              
              setUserRoles(rolesData?.map((r: any) => r.role) || []);
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }, 0);
        } else {
          setProfile(null);
          setUserRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: profileData } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            setProfile(profileData);

            const { data: rolesData } = await (supabase as any)
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);
            
            setUserRoles(rolesData?.map((r: any) => r.role) || []);
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (usernameOrEmail: string, password: string) => {
    try {
      // Check if input is email or username
      let email = usernameOrEmail;
      
      if (!navigator.onLine) {
        // Offline authentication
        const cached = await getCachedAuth();
        if (!cached) {
          return { error: { message: 'Aucune donnée hors ligne disponible. Connectez-vous en ligne d\'abord.' } };
        }
        const hashed = await hashPassword(password);
        if (cached.email === usernameOrEmail && cached.passwordHash === hashed) {
          setProfile(cached.profile);
          setUserRoles(cached.roles);
          setLoading(false);
          toast({
            title: "Connexion hors ligne",
            description: "Mode hors ligne activé",
          });
          return { error: null };
        }
        return { error: { message: 'Identifiants incorrects (mode hors ligne)' } };
      }

      if (!usernameOrEmail.includes('@')) {
        const { data: profileData, error: profileError } = await (supabase as any)
          .from('profiles')
          .select('email')
          .eq('username', usernameOrEmail)
          .maybeSingle();

        if (profileError || !profileData) {
          return { error: { message: 'Nom d\'utilisateur introuvable' } };
        }
        email = profileData.email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: error.message === 'Invalid login credentials' 
            ? 'Identifiants incorrects' 
            : error.message,
        });
        return { error };
      }

      // Cache credentials for offline use
      try {
        const hashed = await hashPassword(password);
        const { data: prof } = await (supabase as any).from('profiles').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id).maybeSingle();
        const { data: roles } = await (supabase as any).from('user_roles').select('role').eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        if (prof) {
          await cacheAuthCredentials(email, hashed, prof, roles?.map((r: any) => r.role) || []);
        }
      } catch (cacheErr) {
        console.warn('Failed to cache auth:', cacheErr);
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur AgriCapital CRM",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter",
      });
    } else {
      toast({
        title: "Déconnexion",
        description: "À bientôt !",
      });
    }
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      userRoles, 
      loading, 
      signIn, 
      signOut,
      hasRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
