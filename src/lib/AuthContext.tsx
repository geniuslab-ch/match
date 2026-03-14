import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User, UserRole } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, pseudo: string, role: UserRole) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser(authId: string): Promise<User | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();
    return data as User | null;
  }

  // Attendre que le trigger crée le profil (petite latence possible)
  async function fetchUserWithRetry(authId: string, retries = 5): Promise<User | null> {
    for (let i = 0; i < retries; i++) {
      const u = await fetchUser(authId);
      if (u) return u;
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

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

  // Inscription : les métadonnées sont passées au trigger via raw_user_meta_data
  async function signUp(
    email: string,
    password: string,
    fullName: string,
    pseudo: string,
    role: UserRole
  ): Promise<string | null> {
    if (!supabase) return 'Supabase non configuré';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          pseudo,
          role,
        },
      },
    });

    if (error) return error.message;
    if (!data.user) return 'Erreur lors de la création du compte';

    // Attendre que le trigger PostgreSQL crée le profil users
    const u = await fetchUserWithRetry(data.user.id);
    setUser(u);
    return null;
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase non configuré';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }

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
