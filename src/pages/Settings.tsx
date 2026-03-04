import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Bell, Moon, Clock, User, Shield, Send } from 'lucide-react';
import PushDiagnostic from '@/components/settings/PushDiagnostic';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/notifications';
import { useWebPush } from '@/hooks/useWebPush';

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [prayerReminders, setPrayerReminders] = useState(true);
  const [ramadanActivities, setRamadanActivities] = useState(true);
  const [fajrReminder, setFajrReminder] = useState(true);
  const [dhuhrReminder, setDhuhrReminder] = useState(true);
  const [asrReminder, setAsrReminder] = useState(true);
  const [maghribReminder, setMaghribReminder] = useState(true);
  const [ishaReminder, setIshaReminder] = useState(true);
  const [loading, setLoading] = useState(true);
  const [testingSend, setTestingSend] = useState(false);
  const { isSubscribed, isSupported, isLoading: pushLoading, error: pushError, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = useWebPush();

  const handleTestPush = async () => {
    setTestingSend(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: '🧪 Test notification',
          body: 'Si tu vois ceci, les notifications push fonctionnent !',
          type: 'admin',
        },
      });
      if (error) throw error;
      if (data?.sent > 0) {
        toast({ title: `✅ Notification envoyée ! (${data.sent}/${data.total})` });
      } else {
        toast({ title: '⚠️ Aucun abonnement trouvé', description: `Total: ${data?.total || 0}, Expirés: ${data?.expired || 0}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: '❌ Erreur', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setTestingSend(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [user, isSubscribed]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      // Sync notification state with actual push subscription
      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted' && isSubscribed);
      }

      // Load preferences from database
      const prefs = await getNotificationPreferences(user.id);
      if (prefs) {
        setPrayerReminders(prefs.prayer_reminders);
        setRamadanActivities(prefs.ramadan_activities);
        setFajrReminder(prefs.fajr_reminder);
        setDhuhrReminder(prefs.dhuhr_reminder);
        setAsrReminder(prefs.asr_reminder);
        setMaghribReminder(prefs.maghrib_reminder);
        setIshaReminder(prefs.isha_reminder);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleEnableNotifications = async () => {
    if (!user) return;
    try {
      const success = await pushSubscribe();
      if (success) {
        setNotificationsEnabled(true);
        toast({ title: '✅ Notifications activées !' });
      } else {
        toast({
          title: 'Échec activation',
          description: pushError || 'Vérifiez les permissions du navigateur',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'activer les notifications',
        variant: 'destructive',
      });
    }
  };

  const handleDisableNotifications = async () => {
    if (!user) return;
    try {
      await pushUnsubscribe();
      setNotificationsEnabled(false);
      toast({ title: 'Notifications désactivées' });
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    try {
      await updateNotificationPreferences(user.id, {
        prayer_reminders: prayerReminders,
        ramadan_activities: ramadanActivities,
        fajr_reminder: fajrReminder,
        dhuhr_reminder: dhuhrReminder,
        asr_reminder: asrReminder,
        maghrib_reminder: maghribReminder,
        isha_reminder: ishaReminder,
      });
      toast({ title: 'Préférences enregistrées' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les préférences',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <AppLayout title="Paramètres">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Paramètres">
      <div className="p-4 space-y-4">
        {/* User Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">{user?.user_metadata?.full_name || 'Utilisateur'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Access */}
        {isAdmin && (
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/admin')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="font-bold">Panneau d'administration</p>
                  <p className="text-sm text-muted-foreground">Gérer le contenu et les élèves</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              🔔 Notifications Push
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <span className="text-lg">{notificationsEnabled ? '✅' : '❌'}</span>
              <span className="font-medium text-foreground">
                {notificationsEnabled ? 'Notifications activées' : 'Notifications désactivées'}
              </span>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Activer les notifications push</Label>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnableNotifications();
                  } else {
                    handleDisableNotifications();
                  }
                }}
              />
            </div>

            {/* Admin test button */}
            {isAdmin && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Test notification push</p>
                    <p className="text-sm text-muted-foreground">Envoie une notification à toi-même</p>
                  </div>
                  <Button size="sm" onClick={handleTestPush} disabled={testingSend}>
                    {testingSend ? '⏳ Envoi...' : '🧪 Tester'}
                  </Button>
                </div>
              </div>
            )}

            {/* Diagnostic */}
            <div className="border-t pt-4">
              <PushDiagnostic />
            </div>

            {notificationsEnabled && (
              <>
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label>Rappels de prière</Label>
                    </div>
                    <Switch
                      checked={prayerReminders}
                      onCheckedChange={setPrayerReminders}
                    />
                  </div>

                  {prayerReminders && (
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Fajr</Label>
                        <Switch checked={fajrReminder} onCheckedChange={setFajrReminder} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Dhuhr</Label>
                        <Switch checked={dhuhrReminder} onCheckedChange={setDhuhrReminder} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Asr</Label>
                        <Switch checked={asrReminder} onCheckedChange={setAsrReminder} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Maghrib</Label>
                        <Switch checked={maghribReminder} onCheckedChange={setMaghribReminder} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Isha</Label>
                        <Switch checked={ishaReminder} onCheckedChange={setIshaReminder} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-muted-foreground" />
                      <Label>Activités Ramadan</Label>
                    </div>
                    <Switch
                      checked={ramadanActivities}
                      onCheckedChange={setRamadanActivities}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePreferences} className="w-full">
                  Enregistrer les préférences
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
