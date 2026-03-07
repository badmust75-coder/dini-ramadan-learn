import { useEffect, useCallback } from 'react';

const CHECK_INTERVAL = 300000; // Check every 5 minutes

export const useAutoUpdate = () => {
  const checkForUpdates = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          // If there's a waiting worker, activate it immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkForUpdates();

    // Periodic check every 5 seconds
    const intervalId = setInterval(checkForUpdates, CHECK_INTERVAL);

    // Check immediately when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Reload page as soon as new SW takes control
    const handleControllerChange = () => {
      window.location.reload();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, [checkForUpdates]);
};

