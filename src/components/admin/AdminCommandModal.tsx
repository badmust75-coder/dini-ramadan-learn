import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, ClipboardCheck, Sparkles, Hand, Shield, BarChart3 } from 'lucide-react';

interface AdminCommandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingRegistrations: number;
  pendingSourates: number;
  pendingNourania: number;
  pendingInvocations: number;
  pendingMessages: number;
  pendingHomework: number;
  total: number;
}

const AdminCommandModal = ({
  open,
  onOpenChange,
  pendingRegistrations,
  pendingSourates,
  pendingNourania,
  pendingInvocations,
}: AdminCommandModalProps) => {
  const navigate = useNavigate();

  const cards = [
    { emoji: '📝', label: 'Inscriptions en attente', count: pendingRegistrations, icon: UserCheck, section: 'registration-validations' },
    { emoji: '✅', label: 'Sourates à valider', count: pendingSourates, icon: ClipboardCheck, section: 'sourates-validations' },
    { emoji: '🌟', label: 'Nourania à valider', count: pendingNourania, icon: Sparkles, section: 'nourania-validations' },
    { emoji: '🤲', label: 'Invocations à valider', count: pendingInvocations, icon: Hand, section: 'invocations-validations' },
  ];

  const handleCardClick = (section: string) => {
    onOpenChange(false);
    navigate(`/admin?section=${section}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" /> 🛡️ Administration
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => {
            const isOk = card.count === 0;
            return (
              <button
                key={card.section}
                onClick={() => handleCardClick(card.section)}
                className={`rounded-xl p-3 border transition-all text-left ${
                  isOk
                    ? 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{card.emoji}</span>
                  {card.count > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-2 py-0 animate-pulse">
                      {card.count}
                    </Badge>
                  )}
                </div>
                <p className={`text-xs font-medium ${isOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {card.label}
                </p>
                <p className={`text-lg font-bold ${isOk ? 'text-emerald-600' : 'text-red-600'}`}>
                  {card.count}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={() => { onOpenChange(false); navigate('/admin'); }} className="w-full">
            Voir le tableau de bord complet →
          </Button>
          <Button variant="outline" onClick={() => { onOpenChange(false); navigate('/monitoring'); }} className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" /> 📊 Monitoring →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminCommandModal;
