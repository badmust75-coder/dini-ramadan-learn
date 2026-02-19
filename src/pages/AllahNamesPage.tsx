import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AllahNamesPage = () => {
  const [selected, setSelected] = useState<any>(null);

  const { data: names = [], isLoading } = useQuery({
    queryKey: ['allah-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('allah_names').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <AppLayout title="99 Noms d'Allah">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="rounded-2xl p-4 border border-border bg-gradient-to-br from-orange-500 to-amber-600 text-white">
          <h2 className="font-bold text-xl">99 Noms d'Allah</h2>
          <p className="font-arabic text-lg opacity-90">أسماء الله الحسنى</p>
          <p className="text-sm opacity-80 mt-1">{names.length} noms</p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {names.map((name: any) => (
              <button
                key={name.id}
                onClick={() => setSelected(name)}
                className="relative flex flex-col items-center justify-center rounded-2xl p-3 border border-border bg-card hover:shadow-md active:scale-95 transition-all min-h-[90px] gap-1"
              >
                <span className="absolute top-1.5 left-2 text-[10px] text-muted-foreground font-bold">
                  {name.display_order}
                </span>
                {name.image_url ? (
                  <img src={name.image_url} alt={name.name_french} className="w-10 h-10 object-contain mb-1" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center mb-1">
                    <span className="font-arabic text-white text-xs font-bold">{name.display_order}</span>
                  </div>
                )}
                <p className="font-arabic text-sm text-foreground text-center leading-tight line-clamp-2">
                  {name.name_arabic}
                </p>
                <p className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-1">
                  {name.name_french}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Detail dialog */}
        {selected && (
          <Dialog open onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center">
                  <span className="text-orange-500 text-sm font-normal block">Nom #{selected.display_order}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-center">
                <div className="py-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-2xl">
                  <p className="font-arabic text-5xl text-orange-600 dark:text-orange-400 mb-3">{selected.name_arabic}</p>
                  <p className="text-xl font-bold text-foreground">{selected.name_french}</p>
                  {selected.transliteration && (
                    <p className="text-sm text-muted-foreground italic mt-1">{selected.transliteration}</p>
                  )}
                </div>
                {selected.explanation && (
                  <div className="bg-muted/30 rounded-xl p-4 text-left">
                    <p className="text-sm font-semibold text-foreground mb-1">Explication</p>
                    <p className="text-sm text-muted-foreground">{selected.explanation}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
};

export default AllahNamesPage;
