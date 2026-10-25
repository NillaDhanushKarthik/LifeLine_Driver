// Looping emergency siren + repeating vibration. Runs until stopSiren() (accept / reject / taken / expired).
import { Vibration } from 'react-native';

const listeners = new Set();
let isPlaying = false;

export function addSirenListener(fn) {
  listeners.add(fn);
  try {
    fn(isPlaying);
  } catch {}
  return () => {
    listeners.delete(fn);
  };
}

export function preloadSiren() {
  // Pre-warming hook
}

export function startSiren() {
  if (isPlaying) return;
  isPlaying = true;
  // Intense repeating vibration pattern: 1000ms vibration, 400ms pause
  Vibration.vibrate([0, 1000, 400], true);
  listeners.forEach((fn) => {
    try { fn(true); } catch {}
  });
}

export function stopSiren() {
  if (!isPlaying) return;
  isPlaying = false;
  Vibration.cancel();
  listeners.forEach((fn) => {
    try { fn(false); } catch {}
  });
}
