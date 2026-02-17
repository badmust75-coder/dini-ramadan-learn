import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import AdminModuleCard from '@/components/admin/AdminModuleCard';
import AdminModuleProgress from '@/components/admin/AdminModuleProgress';
import AdminUsersList from '@/components/admin/AdminUsersList';
import AdminStudentDetails from '@/components/admin/AdminStudentDetails';
import AdminRamadanManager from '@/components/admin/AdminRamadanManager';
import AdminMessaging from '@/components/admin/AdminMessaging';
import AdminNouraniaContent from '@/components/admin/AdminNouraniaContent';
import AdminSourateContent from '@/components/admin/AdminSourateContent';
import AdminSourateValidations from '@/components/admin/AdminSourateValidations';
import AdminRegistrationValidations from '@/components/admin/AdminRegistrationValidations';
import AdminNouraniaValidations from '@/components/admin/AdminNouraniaValidations';
import AdminDynamicCardDialog from '@/components/admin/AdminDynamicCardDialog';
import AdminDynamicCardContent from '@/components/admin/AdminDynamicCardContent';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import { 
  Users, GraduationCap, Moon, Sparkles, BookOpen, MessageSquare, 
  BookMarked, Hand, Settings, Mail, ClipboardCheck, UserCheck,
  Plus, GripVertical, MoreVertical, Pencil, Trash2,
  FileText, List, Video, Star, Heart, Bell, Calendar, Image, Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, List, Video, BookOpen, Star, Heart, Bell, Calendar, Image, Music,
};

type ViewType = 'dashboard' | 'users' | 'students' | 'ramadan' | 'ramadan-manage' | 'nourania' | 'nourania-manage' | 'nourania-validations' | 'alphabet' | 'invocations' | 'sourates' | 'sourates-manage' | 'sourates-validations' | 'registration-validations' | 'prayer' | 'messages' | 'dynamic-card-content';

interface CardItem {
  id: string;
  type: 'static' | 'dynamic';
  key: string;
  order: number;
  dynamicCard?: any;
}

// Sortable wrapper component
const SortableCard = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <button
        {...attributes}
        {...listeners}
        className="flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Déplacer"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  const [pendingNourania, setPendingNourania] = useState(0);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [deleteCardOpen, setDeleteCardOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [selectedDynamicCard, setSelectedDynamicCard] = useState<any>(null);

  // Fetch pending validation count
  const { data: pendingValidations } = useQuery({
    queryKey: ['admin-pending-validations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sourate_validation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch pending registration count
  const { data: pendingRegCount } = useQuery({
    queryKey: ['admin-pending-registrations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch pending nourania validation count
  const { data: pendingNouraniaCount } = useQuery({
    queryKey: ['admin-pending-nourania-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('nourania_validation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch dynamic cards
  const { data: dynamicCards } = useQuery({
    queryKey: ['admin-dynamic-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_cards')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch card ordering
  const { data: cardOrdering } = useQuery({
    queryKey: ['admin-card-ordering'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_card_order')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => { setPendingCount(pendingValidations || 0); }, [pendingValidations]);
  useEffect(() => { setPendingRegistrations(pendingRegCount || 0); }, [pendingRegCount]);
  useEffect(() => { setPendingNourania(pendingNouraniaCount || 0); }, [pendingNouraniaCount]);

  // Realtime subscription for pending count updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sourate_validation_requests' }, async () => {
        const { count } = await supabase.from('sourate_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setPendingCount(count || 0);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false);
        setPendingRegistrations(count || 0);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nourania_validation_requests' }, async () => {
        const { count } = await supabase.from('nourania_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setPendingNourania(count || 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalRamadanDays },
        { count: totalNouraniaLessons },
        { count: totalAlphabetLetters },
        { count: totalInvocations },
        { count: totalSourates },
        { count: totalPrayerCategories },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('ramadan_days').select('*', { count: 'exact', head: true }),
        supabase.from('nourania_lessons').select('*', { count: 'exact', head: true }),
        supabase.from('alphabet_letters').select('*', { count: 'exact', head: true }),
        supabase.from('invocations').select('*', { count: 'exact', head: true }),
        supabase.from('sourates').select('*', { count: 'exact', head: true }),
        supabase.from('prayer_categories').select('*', { count: 'exact', head: true }),
      ]);
      return {
        users: totalUsers || 0, ramadan: totalRamadanDays || 0, nourania: totalNouraniaLessons || 0,
        alphabet: totalAlphabetLetters || 0, invocations: totalInvocations || 0,
        sourates: totalSourates || 0, prayer: totalPrayerCategories || 0,
      };
    },
  });

  // Static cards definition
  const STATIC_CARDS = useMemo(() => [
    { key: 'users', title: 'Utilisateurs', icon: Users, value: stats?.users || 0, subtitle: 'inscrits', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', cardBgColor: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800', view: 'users' as ViewType },
    { key: 'messages', title: 'Messages', icon: Mail, value: 'Voir', subtitle: 'Messages des élèves', color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30', cardBgColor: 'bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800', view: 'messages' as ViewType },
    { key: 'students', title: 'Élèves', icon: GraduationCap, value: stats?.users || 0, subtitle: 'suivis', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', cardBgColor: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800', view: 'students' as ViewType },
    { key: 'ramadan', title: 'Ramadan', icon: Moon, value: `${stats?.ramadan || 0} jours`, subtitle: 'Progression par élève', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', cardBgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800', view: 'ramadan' as ViewType, manageView: 'ramadan-manage' as ViewType },
    { key: 'nourania', title: 'Nourania', icon: Sparkles, value: `${stats?.nourania || 0} leçons`, subtitle: 'Progression par élève', color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30', cardBgColor: 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800', view: 'nourania' as ViewType, manageView: 'nourania-manage' as ViewType },
    { key: 'alphabet', title: 'Alphabet', icon: BookOpen, value: `${stats?.alphabet || 0} lettres`, subtitle: 'Progression par élève', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30', cardBgColor: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800', view: 'alphabet' as ViewType },
    { key: 'invocations', title: 'Invocations', icon: MessageSquare, value: `${stats?.invocations || 0} disponibles`, subtitle: 'Progression par élève', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30', cardBgColor: 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800', view: 'invocations' as ViewType },
    { key: 'sourates', title: 'Sourates', icon: BookMarked, value: `${stats?.sourates || 0} sourates`, subtitle: 'Progression par élève', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', cardBgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800', view: 'sourates' as ViewType, manageView: 'sourates-manage' as ViewType },
    { key: 'prayer', title: 'Prière', icon: Hand, value: `${stats?.prayer || 0} catégories`, subtitle: 'Progression par élève', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30', cardBgColor: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800', view: 'prayer' as ViewType },
  ], [stats]);

  // Combine static + dynamic cards with ordering
  const orderedCards = useMemo(() => {
    const orderMap = new Map<string, number>();
    cardOrdering?.forEach(o => orderMap.set(o.card_key, o.display_order));

    const items: CardItem[] = [];

    // Add static cards
    STATIC_CARDS.forEach((card, idx) => {
      items.push({
        id: `static-${card.key}`,
        type: 'static',
        key: card.key,
        order: orderMap.get(`static-${card.key}`) ?? idx,
      });
    });

    // Add dynamic cards
    dynamicCards?.forEach((card, idx) => {
      items.push({
        id: `dynamic-${card.id}`,
        type: 'dynamic',
        key: card.id,
        order: orderMap.get(`dynamic-${card.id}`) ?? (STATIC_CARDS.length + idx),
        dynamicCard: card,
      });
    });

    items.sort((a, b) => a.order - b.order);
    return items;
  }, [STATIC_CARDS, dynamicCards, cardOrdering]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveOrderMutation = useMutation({
    mutationFn: async (newOrder: CardItem[]) => {
      const upsertData = newOrder.map((item, idx) => ({
        card_key: item.id,
        display_order: idx,
        updated_at: new Date().toISOString(),
      }));

      for (const item of upsertData) {
        await supabase
          .from('admin_card_order')
          .upsert(item, { onConflict: 'card_key' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-card-ordering'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCards.findIndex(c => c.id === active.id);
    const newIndex = orderedCards.findIndex(c => c.id === over.id);
    const newOrder = arrayMove(orderedCards, oldIndex, newIndex);
    saveOrderMutation.mutate(newOrder);
  };

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from('dashboard_cards').delete().eq('id', cardId);
      if (error) throw error;
      // Also remove from ordering
      await supabase.from('admin_card_order').delete().eq('card_key', `dynamic-${cardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dynamic-cards'] });
      queryClient.invalidateQueries({ queryKey: ['admin-card-ordering'] });
      toast.success('Carte supprimée');
      setDeleteCardOpen(false);
      setCardToDelete(null);
    },
    onError: (err: any) => toast.error('Erreur: ' + err.message),
  });

  if (loading) {
    return (
      <AppLayout title="Tableau de bord">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleBack = () => {
    setCurrentView('dashboard');
    setSelectedDynamicCard(null);
  };

  // Sub-view rendering
  if (currentView === 'users') return <AppLayout title="Tableau de bord"><div className="p-4"><AdminUsersList onBack={handleBack} /></div></AppLayout>;
  if (currentView === 'students') return <AppLayout title="Tableau de bord"><div className="p-4"><AdminStudentDetails onBack={handleBack} /></div></AppLayout>;
  if (currentView === 'ramadan-manage') return <AppLayout title="Tableau de bord"><div className="p-4"><AdminRamadanManager onBack={handleBack} /></div></AppLayout>;
  if (currentView === 'nourania-manage') return <AppLayout title="Tableau de bord"><div className="p-4"><Button variant="ghost" onClick={handleBack} className="mb-4">← Retour</Button><AdminNouraniaContent /></div></AppLayout>;
  if (currentView === 'sourates-manage') return <AppLayout title="Tableau de bord"><div className="p-4"><Button variant="ghost" onClick={handleBack} className="mb-4">← Retour</Button><AdminSourateContent /></div></AppLayout>;
  if (currentView === 'sourates-validations') return <AppLayout title="Tableau de bord"><div className="p-4"><AdminSourateValidations onBack={handleBack} /></div></AppLayout>;
  if (currentView === 'nourania-validations') return <AppLayout title="Tableau de bord"><div className="p-4"><AdminNouraniaValidations onBack={handleBack} /></div></AppLayout>;
  if (currentView === 'registration-validations') return <AppLayout title="Tableau de bord"><div className="p-4"><AdminRegistrationValidations onBack={handleBack} /></div></AppLayout>;
  if (currentView === 'messages') return <AppLayout title="Tableau de bord"><div className="p-4"><Button variant="ghost" onClick={handleBack} className="mb-4">← Retour</Button><AdminMessaging /></div></AppLayout>;
  if (currentView === 'dynamic-card-content' && selectedDynamicCard) return <AppLayout title="Tableau de bord"><div className="p-4"><AdminDynamicCardContent card={selectedDynamicCard} onBack={handleBack} /></div></AppLayout>;

  if (['ramadan', 'nourania', 'alphabet', 'invocations', 'sourates', 'prayer'].includes(currentView)) {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminModuleProgress 
            module={currentView as 'ramadan' | 'nourania' | 'alphabet' | 'invocations' | 'sourates' | 'prayer'} 
            onBack={handleBack} 
          />
        </div>
      </AppLayout>
    );
  }

  // Dashboard view
  return (
    <AppLayout title="Tableau de bord">
      <div className="p-4 space-y-4">
        {/* Validation cards at top (NOT sortable) */}
        <button
          onClick={() => setCurrentView('sourates-validations')}
          className={`w-full rounded-2xl p-4 shadow-card border transition-all duration-300 ${
            pendingCount > 0 ? 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20' : 'bg-green-500/10 border-green-300 dark:border-green-700 hover:bg-green-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pendingCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <ClipboardCheck className={`h-6 w-6 ${pendingCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <div className="text-left">
                <p className={`font-bold text-base ${pendingCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>Validations en attente</p>
                <p className={`text-sm ${pendingCount > 0 ? 'text-red-600/70 dark:text-red-400/70' : 'text-green-600/70 dark:text-green-400/70'}`}>
                  {pendingCount > 0 ? 'Sourate(s) à valider' : 'Aucune validation en attente'}
                </p>
              </div>
            </div>
            {pendingCount > 0 && <Badge className="bg-red-500 text-white hover:bg-red-600 text-lg px-3 py-1 animate-pulse">{pendingCount}</Badge>}
          </div>
        </button>

        <button
          onClick={() => setCurrentView('registration-validations')}
          className={`w-full rounded-2xl p-4 shadow-card border transition-all duration-300 ${
            pendingRegistrations > 0 ? 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20' : 'bg-green-500/10 border-green-300 dark:border-green-700 hover:bg-green-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pendingRegistrations > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <UserCheck className={`h-6 w-6 ${pendingRegistrations > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <div className="text-left">
                <p className={`font-bold text-base ${pendingRegistrations > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>Validation d'inscription</p>
                <p className={`text-sm ${pendingRegistrations > 0 ? 'text-red-600/70 dark:text-red-400/70' : 'text-green-600/70 dark:text-green-400/70'}`}>
                  {pendingRegistrations > 0 ? 'Inscription(s) à valider' : 'Aucune inscription en attente'}
                </p>
              </div>
            </div>
            {pendingRegistrations > 0 && <Badge className="bg-red-500 text-white hover:bg-red-600 text-lg px-3 py-1 animate-pulse">{pendingRegistrations}</Badge>}
          </div>
        </button>

        <button
          onClick={() => setCurrentView('nourania-validations')}
          className={`w-full rounded-2xl p-4 shadow-card border transition-all duration-300 ${
            pendingNourania > 0 ? 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20' : 'bg-green-500/10 border-green-300 dark:border-green-700 hover:bg-green-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pendingNourania > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <Sparkles className={`h-6 w-6 ${pendingNourania > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <div className="text-left">
                <p className={`font-bold text-base ${pendingNourania > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>Validation Nourania</p>
                <p className={`text-sm ${pendingNourania > 0 ? 'text-red-600/70 dark:text-red-400/70' : 'text-green-600/70 dark:text-green-400/70'}`}>
                  {pendingNourania > 0 ? 'Leçon(s) à valider' : 'Aucune validation en attente'}
                </p>
              </div>
            </div>
            {pendingNourania > 0 && <Badge className="bg-red-500 text-white hover:bg-red-600 text-lg px-3 py-1 animate-pulse">{pendingNourania}</Badge>}
          </div>
        </button>

        <h2 className="text-xl font-bold text-foreground mb-4">Gestion des élèves</h2>

        {/* Sortable cards area */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {orderedCards.map((item) => {
                if (item.type === 'static') {
                  const card = STATIC_CARDS.find(c => c.key === item.key);
                  if (!card) return null;
                  return (
                    <SortableCard key={item.id} id={item.id}>
                      <AdminModuleCard
                        title={card.title}
                        icon={card.icon}
                        value={card.value}
                        subtitle={card.subtitle}
                        color={card.color}
                        bgColor={card.bgColor}
                        cardBgColor={card.cardBgColor}
                        onClick={() => setCurrentView(card.view)}
                        actionButton={
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setCurrentView(card.view)}>
                                <BookOpen className="h-4 w-4 mr-2" /> Voir la progression
                              </DropdownMenuItem>
                              {card.manageView && (
                                <DropdownMenuItem onClick={() => setCurrentView(card.manageView!)}>
                                  <Settings className="h-4 w-4 mr-2" /> Gérer le contenu
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        }
                      />
                    </SortableCard>
                  );
                }

                // Dynamic card
                const dynCard = item.dynamicCard;
                if (!dynCard) return null;
                const DynIcon = ICON_MAP[dynCard.icon] || FileText;
                return (
                  <SortableCard key={item.id} id={item.id}>
                    <div className="relative">
                      <AdminModuleCard
                        title={dynCard.title}
                        icon={DynIcon}
                        value={dynCard.content_type === 'text' ? 'Texte' : dynCard.content_type === 'list' ? 'Liste' : dynCard.content_type === 'video' ? 'Vidéo' : 'Document'}
                        subtitle={dynCard.is_public ? 'Public' : 'Restreint'}
                        color="text-foreground"
                        bgColor={dynCard.bg_color}
                        cardBgColor={`${dynCard.bg_color.replace('dark:bg-', 'dark:border-').replace('/30', '/50')} border`}
                        onClick={() => {
                          setSelectedDynamicCard(dynCard);
                          setCurrentView('dynamic-card-content');
                        }}
                        actionButton={
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingCard(dynCard); setCardDialogOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedDynamicCard(dynCard);
                                setCurrentView('dynamic-card-content');
                              }}>
                                <FileText className="h-4 w-4 mr-2" /> Gérer le contenu
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setCardToDelete(dynCard.id); setDeleteCardOpen(true); }}>
                                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        }
                      />
                    </div>
                  </SortableCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Floating add button */}
        <button
          onClick={() => { setEditingCard(null); setCardDialogOpen(true); }}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all z-40"
        >
          <Plus className="h-6 w-6" />
        </button>

        <AdminDynamicCardDialog
          open={cardDialogOpen}
          onOpenChange={(open) => { setCardDialogOpen(open); if (!open) setEditingCard(null); }}
          editCard={editingCard}
        />

        <ConfirmDeleteDialog
          open={deleteCardOpen}
          onOpenChange={setDeleteCardOpen}
          onConfirm={() => cardToDelete && deleteCardMutation.mutate(cardToDelete)}
          title="Supprimer la carte"
          description="Voulez-vous vraiment supprimer cette carte et tout son contenu ?"
        />
      </div>
    </AppLayout>
  );
};

export default Admin;
