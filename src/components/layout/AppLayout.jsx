/**
 * AppLayout — shared shell wrapping all authenticated pages.
 *
 * Renders:
 *   - Sidebar (desktop fixed + mobile drawer)
 *   - Top bar (mobile hamburger + page title)
 *   - <Outlet /> for nested route content
 *
 * The content area shifts right on desktop to accommodate the fixed sidebar.
 * Sidebar width: collapsed=64px (w-16), expanded=240px (w-60).
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import navigation from '../../config/navigation';

const COLLAPSED_KEY = 'mf-sidebar-collapsed';

function getInitialCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/* ── Derive a readable page title from the current path ──────────────────── */
function usePageTitle() {
  const { pathname } = useLocation();
  const map = {};
  navigation.forEach((item) => {
    if (item.path) map[item.path] = item.label;
    item.children?.forEach((c) => {
      map[c.path] = c.label;
    });
  });
  return (
    map[pathname] ??
    Object.entries(map)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([p]) => pathname.startsWith(p))?.[1] ??
    'MicroFlat ERP'
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const title = usePageTitle();

  // Sync collapsed state when Sidebar dispatches 'mf-sidebar-toggle'
  useEffect(() => {
    function syncFromStorage() {
      setCollapsed(getInitialCollapsed());
    }
    window.addEventListener('mf-sidebar-toggle', syncFromStorage);
    return () => window.removeEventListener('mf-sidebar-toggle', syncFromStorage);
  }, []);

  // Desktop sidebar widths (must match Sidebar.jsx Tailwind classes: w-16 = 64px, w-60 = 240px)
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/*
        Main column.
        On mobile (<1024px): full width (sidebar is off-canvas, not in flow).
        On desktop (>=1024px): push right by sidebar width via inline style.
        We conditionally apply the margin only above lg breakpoint using a
        CSS custom property so the transition is smooth.
      */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{
          /* Tailwind can't conditionally compute a pixel value, so we use inline style. */
          /* On mobile the sidebar is off-canvas so no margin needed. */
          /* The `lg:` prefix equivalent: only apply on >=1024px. */
          '--sidebar-offset': `${sidebarWidth}px`,
        }}
      >
        {/*
          A single-line <style> to apply the margin only on lg+.
          This keeps the JS logic in one place (sidebarWidth) without
          duplicating the Tailwind class map.
        */}
        <style>{`
          @media (min-width: 1024px) {
            .app-layout-main {
              margin-left: var(--sidebar-offset);
              transition: margin-left 200ms ease-in-out;
            }
          }
        `}</style>

        <div className="app-layout-main flex flex-col flex-1 min-w-0">
          {/* ── Top bar ── */}
          <header
            className={[
              'sticky top-0 z-20 flex items-center gap-4',
              'h-14 px-4 sm:px-6',
              'bg-bg/90 backdrop-blur-md border-b border-border',
            ].join(' ')}
          >
            {/* Hamburger — mobile/tablet only */}
            <button
              type="button"
              id="mobile-menu-button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={[
                'lg:hidden p-2 rounded-lg text-text-muted',
                'hover:bg-surface hover:text-text transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
              ].join(' ')}
            >
              {mobileOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>

            {/* Page title */}
            <h1 className="text-base font-semibold text-heading truncate">{title}</h1>
          </header>

          {/* ── Page content ── */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
