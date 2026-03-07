import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean | null;
  signUp: (email: string, password: string, fullName?: string, gender?: string, dateOfBirth?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) { console.error('Error checking admin role:', error); return false; }
      return !!data;
    } catch (err) { console.error('Error in checkAdminRole:', err); return false; }
  }, []);

  const checkApprovalStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) { console.error('Error checking approval:', error); return false; }
      return data?.is_approved ?? false;
    } catch (err) { console.error('Error in checkApprovalStatus:', err); return false; }
  }, []);

  useEffect(() => {
    let mounted = true;

    // SAFETY TIMEOUT: loading passes to false after 2s max no matter what
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setLoading(false);
          clearTimeout(safetyTimer);

          // Roles in background, never block rendering
          checkAdminRole(session.user.id).then(val => {
            if (mounted) setIsAdmin(val);
          });
          checkApprovalStatus(session.user.id).then(val => {
            if (mounted) {
              checkAdminRole(session.user.id).then(isAdm => {
                if (mounted) setIsApproved(isAdm ? true : val);
              });
            }
          });

          // Update last_seen silently
          (supabase as any).from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          checkAdminRole(session.user.id).then(val => {
            if (mounted) setIsAdmin(val);
          });
          checkApprovalStatus(session.user.id).then(val => {
            if (mounted) {
              checkAdminRole(session.user.id).then(isAdm => {
                if (mounted) setIsApproved(isAdm ? true : val);
              });
            }
          });
        } else {
          setUser(null);
          setIsAdmin(false);
          setIsApproved(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [checkAdminRole, checkApprovalStatus]);

  const signUp = async (email: string, password: string, fullName?: string, gender?: string, dateOfBirth?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, gender, date_of_birth: dateOfBirth },
        },
      });
      if (error) throw error;

      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        const updateData: any = { full_name: fullName, gender };
        if (dateOfBirth) { updateData.date_of_birth = dateOfBirth; updateData.dob_set_by_user = true; }
        await supabase.from('profiles').update(updateData).eq('user_id', newUser.id);
        supabase.functions.invoke('send-push-notification', {
          body: { title: '📝 Nouvelle inscription', body: `${fullName || email} demande à rejoindre l'application.`, type: 'admin' },
        }).catch(err => console.error('Push notification error:', err));
      }

      return { error: null };
    } catch (error) { return { error: error as Error }; }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) { return { error: error as Error }; }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsApproved(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) { return { error: error as Error }; }
  };

  const value = { user, session, loading, isAdmin, isApproved, signUp, signIn, signOut, resetPassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
