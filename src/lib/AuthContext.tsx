import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User, UserRole } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil utilisateur depuis la table `users`
  async function fetchUser(authId: string) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();
    return data as User | null;
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Session initiale
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchUser(s.user.id).then((u) => {
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s?.user) {
          const u = await fetchUser(s.user.id);
          setUser(u);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Inscription
  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ): Promise<string | null> {
    if (!supabase) return 'Supabase non configuré';

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.user) return 'Erreur lors de la création du compte';

    // Créer le profil dans la table `users`
    const { error: profileError } = await supabase.from('users').insert({
      auth_id: data.user.id,
      email,
      full_name: fullName,
      role,
    });
    if (profileError) return profileError.message;

    const u = await fetchUser(data.user.id);
    setUser(u);
    return null;
  }

  // Connexion
  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase non configuré';

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }

  // Déconnexion
  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
