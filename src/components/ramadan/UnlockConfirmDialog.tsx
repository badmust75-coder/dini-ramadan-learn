import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Moon, Star } from 'lucide-react';

interface UnlockConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  dayNumber: number;
}

const UnlockConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  dayNumber,
}: UnlockConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Moon className="h-6 w-6 text-gold" />
            <Star className="h-5 w-5 text-gold" />
          </div>
          <AlertDialogTitle className="text-center">
            Es-tu prêt pour la suite ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <p className="text-lg font-arabic">بالصحة فطورك</p>
            <p>En attendant, bsaha ftourek ! 🌙</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tu t'apprêtes à découvrir le Jour {dayNumber}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-gold to-gold-dark text-primary"
          >
            Oui, je suis prêt(e) !
          </AlertDialogAction>
          <AlertDialogCancel className="w-full">
            Pas encore
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnlockConfirmDialog;
