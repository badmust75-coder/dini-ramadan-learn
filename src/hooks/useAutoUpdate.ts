import { useEffect } from 'react';

export const useAutoUpdate = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Single update check on mount
    navigator.serviceWorker.ready.then((reg) => {
      reg.update();
    });

    // Check when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((reg) => reg.update());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
