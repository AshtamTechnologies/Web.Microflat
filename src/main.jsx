import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';

/* ── Typography (self-hosted via @fontsource) ── */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/*
      Single global Toaster — colors derived from design tokens.
    */}
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          borderRadius: 'var(--radius-control)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-dropdown)',
          maxWidth: '360px',
        },
        success: {
          style: {
            background: 'var(--success-bg)',
            color: 'var(--success-text)',
            border: '1px solid var(--success-border)',
          },
          iconTheme: {
            primary: 'var(--success)',
            secondary: 'var(--on-primary)',
          },
        },
        error: {
          style: {
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            border: '1px solid var(--danger-border)',
          },
          iconTheme: {
            primary: 'var(--danger)',
            secondary: 'var(--on-primary)',
          },
        },
      }}
    />
  </StrictMode>,
);
