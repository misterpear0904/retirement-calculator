import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html.');
}
const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Signal to the boot watchdog in index.html that the bundle executed and mounted.
(window as { __apexMounted?: boolean; __apexBootTimer?: number }).__apexMounted = true;
const bootTimer = (window as { __apexBootTimer?: number }).__apexBootTimer;
if (bootTimer) window.clearTimeout(bootTimer);
