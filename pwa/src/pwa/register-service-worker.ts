import { isNativeAppBuild } from '../services/firmware-target';

export function registerServiceWorker(): void {
  if (isNativeAppBuild() || !('serviceWorker' in navigator) || import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw.js',
      { scope: import.meta.env.BASE_URL },
    );
  });
}
