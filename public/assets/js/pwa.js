// Service-worker registration, update flow and install prompt.
// APP_VERSION is rewritten by scripts/build.mjs (version + content hash).
export const APP_VERSION = '1.0.0';

let deferredPrompt = null;
const listeners = new Set();
const emit = (evt) => listeners.forEach((fn) => fn(evt));
export const onPwaEvent = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  emit({ type: 'installable' });
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  emit({ type: 'installed' });
});

export const canInstall = () => !!deferredPrompt;

/** Shows the native install prompt. Returns 'accepted' | 'dismissed' | 'unavailable'. */
export async function install() {
  if (!deferredPrompt) return 'unavailable';
  const prompt = deferredPrompt;
  deferredPrompt = null;
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}

let waitingWorker = null;
let updateRequested = false;
export function applyUpdate() {
  if (!waitingWorker) { window.location.reload(); return; }
  updateRequested = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Relative URL + scope keep everything inside the GitHub Pages project path.
  const go = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
      const track = (worker) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = worker;
            emit({ type: 'update-ready' });
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; emit({ type: 'update-ready' }); }
      reg.addEventListener('updatefound', () => reg.installing && track(reg.installing));
      // look for a new version whenever the app comes back to the foreground
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  // Reload only when the user accepted an update — not when the very first
  // worker claims the page on initial install.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !updateRequested) return;
    reloading = true;
    window.location.reload();
  });
}
