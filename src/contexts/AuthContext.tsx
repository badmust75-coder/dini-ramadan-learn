import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const checkAdminRole = async (userId: string) => {
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
  };

  const checkApprovalStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) { console.error('Error checking approval:', error); return false; }
      return data?.is_approved ?? false;
    } catch (err) { console.error('Error in checkApprovalStatus:', err); return false; }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const [adminStatus, approvalStatus] = await Promise.all([
            checkAdminRole(session.user.id),
            checkApprovalStatus(session.user.id),
          ]);
          setIsAdmin(adminStatus);
          setIsApproved(adminStatus ? true : approvalStatus);
        } else {
          setIsAdmin(false);
          setIsApproved(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const [adminStatus, approvalStatus] = await Promise.all([
          checkAdminRole(session.user.id),
          checkApprovalStatus(session.user.id),
        ]);
        setIsAdmin(adminStatus);
        setIsApproved(adminStatus ? true : approvalStatus);
        await (supabase as any).from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', session.user.id);
        // VAPID push: subscription handled by useWebPush hook
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
