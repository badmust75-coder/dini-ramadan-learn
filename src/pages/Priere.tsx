import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Check, Plus, Play, FileText, Type, Trash2, 
  Droplets, Waves, Sunrise, Sun, CloudSun, Sunset, Moon, BookOpen, Hand,
  Navigation, MapPin, ChevronDown, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import { usePrayerTimesCity, CITIES, CityOption } from '@/hooks/usePrayerTimesCity';
import SunArcDisplay from '@/components/prayer/SunArcDisplay';
import QiblaCompass from '@/components/prayer/QiblaCompass';
import PrayerWeeklyCalendar from '@/components/prayer/PrayerWeeklyCalendar';
import PrayerModuleCards from '@/components/prayer/PrayerModuleCards';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Droplets, Waves, Sunrise, Sun, CloudSun, Sunset, Moon, BookOpen, Hand
};

const Priere = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState({ arabic: '', french: '' });
  const [newContent, setNewContent] = useState({ type: 'text', title: '', content: '' });
  const [selectedCategoryForContent, setSelectedCategoryForContent] = useState<string | null>(null);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const [showQibla, setShowQibla] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption>(CITIES[0]); // Montpellier by default

  const { prayerTimes, loading: prayerLoading, error: prayerError, getNextPrayer } = usePrayerTimesCity(selectedCity);

  // Fetch categories from database
  const { data: categories = [] } = useQuery({
    queryKey: ['prayer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch content for all categories
  const { data: allContent = [] } = useQuery({
    queryKey: ['prayer-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['prayer-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_prayer_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch daily prayers (last 30 days for calendar)
  const { data: dailyPrayers = [] } = useQuery({
    queryKey: ['user-daily-prayers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('user_daily_prayers')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', fromDate)
        .eq('is_checked', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Today's checked prayers
  const todayKey = getTodayKey();
  const todayChecked = dailyPrayers
    .filter(p => p.date === todayKey)
    .map(p => p.prayer_name);

  // Build calendar data (group by date → count)
  const calendarData = useMemo(() => {
    const map: Record<string, number> = {};
    dailyPrayers.forEach(p => {
      map[p.date] = (map[p.date] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [dailyPrayers]);

  const toggleDailyPrayerMutation = useMutation({
    mutationFn: async (prayerName: string) => {
      if (!user?.id) throw new Error('Non connecté');
      const existing = dailyPrayers.find(p => p.date === todayKey && p.prayer_name === prayerName);
      if (existing) {
        // Toggle off → delete
        const { error } = await supabase
          .from('user_daily_prayers')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Toggle on → insert
        const { error } = await supabase
          .from('user_daily_prayers')
          .insert({ user_id: user.id, date: todayKey, prayer_name: prayerName, is_checked: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-daily-prayers', user?.id] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const validatedCount = userProgress.filter(p => p.is_validated).length;
  const totalCategories = categories.length;
  const progressPercentage = totalCategories > 0 ? Math.round((validatedCount / totalCategories) * 100) : 0;

  const addCategoryMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.display_order)) 
        : 0;
      const { error } = await supabase
        .from('prayer_categories')
        .insert({
          name_arabic: newCategoryName.arabic,
          name_french: newCategoryName.french,
          display_order: maxOrder + 1,
          is_default: false,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-categories'] });
      setShowAddCategory(false);
      setNewCategoryName({ arabic: '', french: '' });
      toast.success('Catégorie ajoutée !');
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const addContentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategoryForContent) throw new Error('Aucune catégorie sélectionnée');
      const categoryContent = allContent.filter(c => c.category_id === selectedCategoryForContent);
      const maxOrder = categoryContent.length > 0 
        ? Math.max(...categoryContent.map(c => c.display_order)) 
        : 0;
      const { error } = await supabase
        .from('prayer_content')
        .insert({
          category_id: selectedCategoryForContent,
          content_type: newContent.type,
          title: newContent.title,
          content: newContent.content,
          display_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-content'] });
      setShowAddContent(false);
      setNewContent({ type: 'text', title: '', content: '' });
      setSelectedCategoryForContent(null);
      toast.success('Contenu ajouté !');
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase
        .from('prayer_content')
        .delete()
        .eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-content'] });
      toast.success('Contenu supprimé');
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!user?.id) throw new Error('Non connecté');
      const existingProgress = userProgress.find(p => p.category_id === categoryId);
      if (existingProgress) {
        const { error } = await supabase
          .from('user_prayer_progress')
          .update({ is_validated: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_prayer_progress')
          .insert({ user_id: user.id, category_id: categoryId, is_validated: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-progress'] });
      toast.success('Catégorie validée !');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const isCategoryValidated = (categoryId: string) =>
    userProgress.some(p => p.category_id === categoryId && p.is_validated);

  const getCategoryContent = (categoryId: string) =>
    allContent.filter(c => c.category_id === categoryId);

  const getIcon = (iconName: string) => iconMap[iconName] || Hand;

  const nextPrayer = prayerTimes ? getNextPrayer() : null;

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">الصلاة</h1>
          <p className="text-muted-foreground">La Prière - Apprentissage complet</p>
        </div>

        {/* Weekly Calendar - moved up */}
        <PrayerWeeklyCalendar prayerData={calendarData} />

        {/* Next prayer banner - moved up */}
        {nextPrayer && (
          <div className="rounded-xl bg-green-700 text-white p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-200">Prochaine prière</p>
              <p className="font-bold text-lg">{nextPrayer.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-xl">{nextPrayer.time}</p>
              <p className="text-xs text-green-200 font-arabic">{nextPrayer.arabic}</p>
            </div>
          </div>
        )}

        {/* ── PRAYER TIMES SECTION ── */}
        <div className="space-y-3 animate-fade-in">
          {/* City selector + Qibla button */}
          <div className="flex items-center gap-2">
            {/* City Selector */}
            <div className="flex-1 relative">
              <button
                onClick={() => setShowCitySelector(!showCitySelector)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                <span className="flex-1 text-left font-medium">{selectedCity.label}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showCitySelector && 'rotate-180')} />
              </button>

              {showCitySelector && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-card border border-border rounded-xl shadow-elevated max-h-56 overflow-y-auto">
                  {CITIES.map((city) => (
                    <button
                      key={city.label}
                      onClick={() => { setSelectedCity(city); setShowCitySelector(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2',
                        selectedCity.label === city.label && 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 font-medium'
                      )}
                    >
                      <span className="flex-1">{city.label}</span>
                      <span className="text-xs text-muted-foreground">{city.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Qibla Button */}
            <Button
              onClick={() => setShowQibla(true)}
              className="gap-2 bg-green-700 hover:bg-green-800 text-white shrink-0"
            >
              <Navigation className="h-4 w-4" />
              Qibla
            </Button>
          </div>

          {/* Prayer times card */}
          {prayerLoading ? (
            <div className="rounded-2xl bg-slate-800 h-40 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement des horaires...</span>
              </div>
            </div>
          ) : prayerError ? (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-center text-sm text-destructive">
              {prayerError}
            </div>
          ) : prayerTimes ? (
            <SunArcDisplay
              prayerTimes={prayerTimes}
              cityLabel={`${selectedCity.label}, ${selectedCity.country}`}
              checkedPrayers={todayChecked}
              onTogglePrayer={(name) => toggleDailyPrayerMutation.mutate(name)}
            />
          ) : null}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Apprentissage</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex gap-2 animate-fade-in">
            <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
              <DialogTrigger asChild>
                <Button className="flex-1 gap-2 bg-gradient-to-r from-gold to-gold-dark text-primary hover:from-gold-dark hover:to-gold">
                  <Plus className="h-4 w-4" />
                  Ajouter une catégorie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle catégorie</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Nom en arabe</label>
                    <Input
                      value={newCategoryName.arabic}
                      onChange={(e) => setNewCategoryName(prev => ({ ...prev, arabic: e.target.value }))}
                      placeholder="الاسم بالعربية"
                      className="font-arabic text-right"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nom en français</label>
                    <Input
                      value={newCategoryName.french}
                      onChange={(e) => setNewCategoryName(prev => ({ ...prev, french: e.target.value }))}
                      placeholder="Nom de la catégorie"
                    />
                  </div>
                  <Button
                    onClick={() => addCategoryMutation.mutate()}
                    disabled={!newCategoryName.arabic || !newCategoryName.french || addCategoryMutation.isPending}
                    className="w-full"
                  >
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Progress */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre progression</span>
            <span className="text-sm font-bold text-primary">{validatedCount}/{totalCategories} catégories</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% complété</p>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          {categories.map((category, index) => {
            const isValidated = isCategoryValidated(category.id);
            const isExpanded = expandedCategory === category.id;
            const content = getCategoryContent(category.id);
            const IconComponent = getIcon(category.icon || 'Hand');

            return (
              <div
                key={category.id}
                className={cn(
                  'module-card rounded-2xl overflow-hidden transition-all duration-300 animate-slide-up',
                  isValidated && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20',
                  isExpanded && 'shadow-elevated'
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <div
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full p-4 flex items-center gap-4 cursor-pointer"
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    isValidated 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gradient-to-br from-gold to-gold-dark'
                  )}>
                    {isValidated ? <Check className="h-6 w-6" /> : <IconComponent className="h-6 w-6 text-primary" />}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <p className="font-arabic text-lg text-foreground truncate">{category.name_arabic}</p>
                    <p className="text-sm text-muted-foreground truncate">{category.name_french}</p>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isValidated) validateMutation.mutate(category.id);
                    }}
                    disabled={isValidated || validateMutation.isPending}
                    size="sm"
                    className={cn(
                      'shrink-0 gap-2',
                      isValidated 
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60 hover:bg-muted' 
                        : 'bg-gradient-to-r from-gold to-gold-dark text-primary hover:from-gold-dark hover:to-gold'
                    )}
                  >
                    <Check className="h-4 w-4" />
                    {isValidated ? 'Validée' : 'Valider'}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {isAdmin && (
                      <Dialog open={showAddContent && selectedCategoryForContent === category.id} onOpenChange={(open) => {
                        setShowAddContent(open);
                        if (open) setSelectedCategoryForContent(category.id);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter du contenu
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajouter du contenu</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <label className="text-sm font-medium">Type de contenu</label>
                              <Select
                                value={newContent.type}
                                onValueChange={(value) => setNewContent(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Texte</SelectItem>
                                  <SelectItem value="video">Vidéo YouTube</SelectItem>
                                  <SelectItem value="pdf">Lien PDF</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Titre</label>
                              <Input
                                value={newContent.title}
                                onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Titre du contenu"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                {newContent.type === 'text' ? 'Contenu' : 
                                 newContent.type === 'video' ? 'URL YouTube' : 'URL du PDF'}
                              </label>
                              {newContent.type === 'text' ? (
                                <Textarea
                                  value={newContent.content}
                                  onChange={(e) => setNewContent(prev => ({ ...prev, content: e.target.value }))}
                                  placeholder="Écrivez votre contenu ici..."
                                  rows={5}
                                />
                              ) : (
                                <Input
                                  value={newContent.content}
                                  onChange={(e) => setNewContent(prev => ({ ...prev, content: e.target.value }))}
                                  placeholder={newContent.type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://example.com/document.pdf'}
                                />
                              )}
                            </div>
                            <Button
                              onClick={() => addContentMutation.mutate()}
                              disabled={!newContent.title || !newContent.content || addContentMutation.isPending}
                              className="w-full"
                            >
                              Ajouter
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {content.length > 0 ? (
                      <div className="space-y-3">
                        {content.map((item) => (
                          <div key={item.id} className="bg-muted/50 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {item.content_type === 'video' && <Play className="h-4 w-4 text-gold" />}
                                {item.content_type === 'pdf' && <FileText className="h-4 w-4 text-gold" />}
                                {item.content_type === 'text' && <Type className="h-4 w-4 text-gold" />}
                                <h4 className="font-medium text-foreground">{item.title}</h4>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteContentId(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {item.content_type === 'text' && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                            )}
                            {item.content_type === 'video' && (
                              <div className="aspect-video rounded-lg overflow-hidden mt-2">
                                <iframe
                                  src={`https://www.youtube.com/embed/${item.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1] || ''}`}
                                  title={item.title}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            {item.content_type === 'pdf' && (
                              <div className="aspect-[3/4] rounded-lg overflow-hidden mt-2">
                                <iframe src={item.content} title={item.title} className="w-full h-full" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Aucun contenu pour le moment</p>
                        {isAdmin && <p className="text-xs mt-1">Cliquez sur "Ajouter du contenu" pour commencer</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Qibla Compass Drawer */}
      {showQibla && (
        <QiblaCompass city={selectedCity} onClose={() => setShowQibla(false)} />
      )}

      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => {
          if (deleteContentId) deleteContentMutation.mutate(deleteContentId);
          setDeleteContentId(null);
        }}
        description="Ce contenu sera supprimé définitivement."
      />
    </AppLayout>
  );
};

export default Priere;
