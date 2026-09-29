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
      success: --success tint background (#16A34A at 10% opacity)
      error:   --danger tint background (#DC2626 at 10% opacity)
    */}
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
          borderRadius: '10px',
          padding: '12px 16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxWidth: '360px',
        },
        success: {
          style: {
            background: 'color-mix(in srgb, #16A34A 12%, white)',
            color: '#166534',
            border: '1px solid color-mix(in srgb, #16A34A 25%, white)',
          },
          iconTheme: {
            primary: '#16A34A',
            secondary: 'white',
          },
        },
        error: {
          style: {
            background: 'color-mix(in srgb, #DC2626 10%, white)',
            color: '#991B1B',
            border: '1px solid color-mix(in srgb, #DC2626 25%, white)',
          },
          iconTheme: {
            primary: '#DC2626',
            secondary: 'white',
          },
        },
      }}
    />
  </StrictMode>,
);
