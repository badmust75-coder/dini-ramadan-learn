import { useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  // Show only if user exists and email is not confirmed
  if (!user || user.email_confirmed_at) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      });
      if (error) throw error;
      toast({ title: '📧 Email renvoyé !', description: 'Vérifie ta boîte mail.' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible de renvoyer l'email", variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 flex items-center gap-3 flex-wrap">
      <Mail className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
        📧 Vérifie ta boîte mail et clique sur le lien de confirmation pour activer ton compte
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={handleResend}
        disabled={sending}
        className="border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${sending ? 'animate-spin' : ''}`} />
        Renvoyer l'email
      </Button>
    </div>
  );
};

export default EmailVerificationBanner;
