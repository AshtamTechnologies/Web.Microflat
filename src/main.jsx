import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import toast, { Toaster, ToastBar } from 'react-hot-toast';

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
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              {t.type !== 'loading' && (
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="ml-2 -mr-1 p-1 rounded-md text-current/60 hover:text-current hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Close"
                  aria-label="Close notification"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  </StrictMode>,
);
