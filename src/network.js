/** Network helpers — online features fail fast without blocking local play */
export const ONLINE_TIMEOUT_MS = 8000;

export function isOnline() {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

export function withTimeout(promise, ms = ONLINE_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), ms);
    }),
  ]);
}
