import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';

interface DiagStep {
  label: string;
  status: 'pending' | 'running' | 'ok' | 'fail';
  detail?: string;
}

const initialSteps: DiagStep[] = [
  { label: 'navigator.serviceWorker disponible', status: 'pending' },
  { label: 'PushManager disponible', status: 'pending' },
  { label: 'Notification.permission actuel', status: 'pending' },
  { label: 'Mode standalone (PWA)', status: 'pending' },
  { label: 'Appel get-vapid-key', status: 'pending' },
  { label: 'pushManager.getSubscription()', status: 'pending' },
  { label: 'pushManager.subscribe()', status: 'pending' },
  { label: 'Vérification push_subscriptions en DB', status: 'pending' },
];

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushDiagnostic() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<DiagStep[]>(initialSteps);
  const [running, setRunning] = useState(false);
  const [showDiag, setShowDiag] = useState(false);

  const update = (idx: number, patch: Partial<DiagStep>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const runDiagnostic = async () => {
    setRunning(true);
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending' as const, detail: undefined })));

    // 1. Service Worker
    update(0, { status: 'running' });
    const hasSW = 'serviceWorker' in navigator;
    update(0, { status: hasSW ? 'ok' : 'fail', detail: hasSW ? 'oui' : 'non' });

    // 2. PushManager
    update(1, { status: 'running' });
    const hasPM = 'PushManager' in window;
    update(1, { status: hasPM ? 'ok' : 'fail', detail: hasPM ? 'oui' : 'non' });

    // 3. Permission
    update(2, { status: 'running' });
    const hasNotifAPI = 'Notification' in window;
    if (!hasNotifAPI) {
      update(2, { status: 'fail', detail: 'API Notification absente' });
    } else {
      const perm = Notification.permission;
      update(2, { status: perm === 'granted' ? 'ok' : perm === 'denied' ? 'fail' : 'pending', detail: perm });
      if (perm === 'default') {
        try {
          const result = await Notification.requestPermission();
          update(2, { status: result === 'granted' ? 'ok' : 'fail', detail: `${perm} → ${result}` });
        } catch (e: any) {
          update(2, { status: 'fail', detail: `requestPermission error: ${e?.message}` });
        }
      }
    }

    // 4. Standalone
    update(3, { status: 'running' });
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    update(3, {
      status: isStandalone ? 'ok' : (isIOS ? 'fail' : 'ok'),
      detail: `standalone=${isStandalone}, iOS=${isIOS}${isIOS && !isStandalone ? ' ⚠️ Ajouter à l\'écran d\'accueil requis' : ''}`
    });

    // 5. VAPID key
    update(4, { status: 'running' });
    let vapidKey: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error) throw error;
      vapidKey = data?.publicKey || null;
      update(4, {
        status: vapidKey ? 'ok' : 'fail',
        detail: vapidKey ? `oui (${vapidKey.substring(0, 10)}...)` : 'clé non reçue'
      });
    } catch (e: any) {
      update(4, { status: 'fail', detail: e?.message || String(e) });
    }

    // 6. Existing subscription
    update(5, { status: 'running' });
    let registration: ServiceWorkerRegistration | null = null;
    let existingSub: any = null;
    if (hasSW) {
      try {
        registration = await navigator.serviceWorker.ready;
        existingSub = await (registration as any).pushManager?.getSubscription();
        update(5, {
          status: existingSub ? 'ok' : 'pending',
          detail: existingSub ? `oui — ${existingSub.endpoint.substring(0, 50)}...` : 'aucun abonnement'
        });
      } catch (e: any) {
        update(5, { status: 'fail', detail: e?.message || String(e) });
      }
    } else {
      update(5, { status: 'fail', detail: 'SW non disponible' });
    }

    // 7. Subscribe attempt
    update(6, { status: 'running' });
    let newSub: any = null;
    if (!registration || !vapidKey || !hasPM) {
      update(6, { status: 'fail', detail: 'Prérequis manquants (SW/VAPID/PushManager)' });
    } else {
      try {
        // Check permission first
        if (!hasNotifAPI || Notification.permission !== 'granted') {
          update(6, { status: 'fail', detail: `Permission non accordée: ${hasNotifAPI ? Notification.permission : 'API absente'}` });
        } else {
          if (existingSub) {
            await existingSub.unsubscribe();
          }
          const keyArray = urlBase64ToUint8Array(vapidKey);
          newSub = await (registration as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyArray
          });
          const keys = newSub.toJSON().keys;
          update(6, {
            status: 'ok',
            detail: `succès — endpoint: ${newSub.endpoint.substring(0, 50)}... p256dh=${!!keys?.p256dh} auth=${!!keys?.auth}`
          });
        }
      } catch (e: any) {
        update(6, { status: 'fail', detail: e?.message || String(e) });
      }
    }

    // 8. DB verification
    update(7, { status: 'running' });
    if (!newSub || !user) {
      update(7, { status: 'fail', detail: !user ? 'Utilisateur non connecté' : 'Pas d\'abonnement à sauvegarder' });
    } else {
      try {
        const keys = newSub.toJSON().keys;
        const { error: upsertErr } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: newSub.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth
          }, { onConflict: 'user_id,endpoint' });

        if (upsertErr) {
          update(7, { status: 'fail', detail: `upsert error: ${upsertErr.message}` });
        } else {
          const { data: row } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', newSub.endpoint)
            .maybeSingle();
          update(7, {
            status: row ? 'ok' : 'fail',
            detail: row ? `✅ Ligne trouvée en DB (id: ${row.id.substring(0, 8)}...)` : '❌ Ligne non trouvée après upsert'
          });
        }
      } catch (e: any) {
        update(7, { status: 'fail', detail: e?.message || String(e) });
      }
    }

    setRunning(false);
  };

  const icon = (s: DiagStep['status']) => {
    switch (s) {
      case 'ok': return '✅';
      case 'fail': return '❌';
      case 'running': return '⏳';
      default: return '⬜';
    }
  };

  if (!showDiag) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowDiag(true)}>
        <Search className="h-4 w-4 mr-2" />
        🔍 Diagnostic notifications
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="h-4 w-4" />
          Diagnostic Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="shrink-0 mt-0.5">{icon(step.status)}</span>
            <div className="min-w-0">
              <span className="font-medium text-foreground">{i + 1}. {step.label}</span>
              {step.detail && (
                <p className="text-xs text-muted-foreground break-all mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={runDiagnostic} disabled={running} className="flex-1">
            {running ? '⏳ En cours...' : '▶️ Lancer le diagnostic'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDiag(false)}>
            Fermer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
