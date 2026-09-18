import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DEFAULT_APPEARANCE, applyAppearance, loadAppearance } from './lib/appearance';
import { loadSessionUserId } from './lib/session';
import { BoardProvider } from './state/boardStore';
import './styles/global.css';

// Tema ve palet, React ilk cizimden once uygulanir; boylece varsayilan
// renklerin bir an gorunup degismesi (flash) yasanmaz.
const bootUserId = loadSessionUserId();
applyAppearance(bootUserId ? loadAppearance(bootUserId) : DEFAULT_APPEARANCE);

const container = document.getElementById('root');
if (!container) throw new Error('#root bulunamadı.');

createRoot(container).render(
  <StrictMode>
    <BoardProvider>
      <App />
    </BoardProvider>
  </StrictMode>,
);
