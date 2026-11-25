import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { loadAll } from './data/store';
import { initSync } from './data/sync';
import { loadTimer, unlockAudio } from './ui/restTimer';
import './ui/styles.css';

async function boot() {
  const root = document.getElementById('root')!;
  try {
    await loadAll();
    await loadTimer();
    await initSync();
  } catch (e) {
    root.innerHTML = `<div class="app"><h1>No se pudo abrir la base de datos</h1><p class="muted">${(e as Error).message}</p><p class="muted">Si usas navegación privada, desactívala: el navegador no permite guardar datos.</p></div>`;
    return;
  }
  createRoot(root).render(<App />);

  // Pedir almacenamiento persistente (evita que el navegador borre datos por falta de espacio).
  navigator.storage?.persist?.().catch(() => {});
  // iOS solo permite audio tras un gesto: se desbloquea con el primer toque.
  window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });

  if ('serviceWorker' in navigator && !location.search.includes('nosw')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
void boot();
