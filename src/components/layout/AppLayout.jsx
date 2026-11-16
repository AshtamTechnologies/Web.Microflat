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

import { useState, useEffect, useRef } from 'react';
import {
  IconClose,
  IconMenu,
  IconPanelLeftOpen,
  IconBell,
  IconMyQueue,
} from '../../constants/icons';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import navigation from '../../config/navigation';
import { useNotifications } from '../../context/NotificationsContext';
import NotificationDropdown from '../notifications/NotificationDropdown';

/** Set to false to instantly hide the footer across all pages in one place */
export const SHOW_FOOTER = true;

const COLLAPSED_KEY = 'mf-sidebar-collapsed';
const SIDEBAR_WIDTH_KEY = 'mf-sidebar-width';
export const DEFAULT_SIDEBAR_WIDTH = 240;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 480;

function getInitialSidebarWidth() {
  try {
    const val = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (val && !isNaN(val) && val >= MIN_SIDEBAR_WIDTH && val <= MAX_SIDEBAR_WIDTH) {
      return val;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

function getInitialCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/* ── Derive a readable page title from the current path ──────────────────── */
function usePageTitle() {
  const { pathname, state } = useLocation();
  const map = {};
  navigation.forEach((entry) => {
    const items = entry.items ? entry.items : [entry];
    items.forEach((item) => {
      if (item.path) map[item.path] = item.label;
      item.children?.forEach((c) => {
        if (c.path) map[c.path] = c.label;
      });
    });
  });
  if (pathname.startsWith('/delegation') && state?.from && map[state.from]) {
    return map[state.from];
  }
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
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const title = usePageTitle();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);

  const { unreadCount, isDropdownOpen, toggleDropdown, closeDropdown, queueSummary } = useNotifications();

  // Ensure <main> scroll container resets to top on every navigation/redirect
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
      window.dispatchEvent(new Event('mf-sidebar-toggle'));
    } catch {
      /* ignore */
    }
  }

  // Sync collapsed state when Sidebar dispatches 'mf-sidebar-toggle'
  useEffect(() => {
    function syncFromStorage() {
      setCollapsed(getInitialCollapsed());
    }
    window.addEventListener('mf-sidebar-toggle', syncFromStorage);
    return () => window.removeEventListener('mf-sidebar-toggle', syncFromStorage);
  }, []);

  // Desktop sidebar widths (must match Sidebar.jsx Tailwind classes: w-16 = 64px, w-60 = 240px)
  function handleSidebarWidthChange(newWidth) {
    const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth));
    setSidebarWidth(clamped);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }

  // Desktop sidebar width: 64px in collapsed rail mode, dynamic custom width in expanded mode
  const effectiveSidebarWidth = collapsed ? 64 : sidebarWidth;

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapsedToggle={toggleCollapsed}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={handleSidebarWidthChange}
        isResizing={isResizingSidebar}
        onResizingChange={setIsResizingSidebar}
      />

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
          '--sidebar-offset': `${effectiveSidebarWidth}px`,
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
              ${isResizingSidebar ? 'transition: none !important;' : 'transition: margin-left 200ms ease-in-out;'}
            }
          }
        `}</style>

        <div className="app-layout-main flex flex-col flex-1 min-w-0">
          {/* ── Top bar ── */}
          <header
            className={[
              'sticky top-0 z-20 flex items-center gap-3 sm:gap-4',
              'h-14 px-4 sm:px-6',
              'bg-bg/90 backdrop-blur-md border-b border-border',
            ].join(' ')}
          >
            {/* Mobile Brand Logo — shown first on mobile */}
            <Link
              to="/dashboard"
              title="Go to Dashboard"
              className="lg:hidden flex items-center shrink-0 pr-0.5"
            >
              <img
                src="/microsidelogo.png"
                alt="Micro-Flat Datums"
                className="w-7 h-7 object-contain"
                draggable={false}
              />
            </Link>

            {/* Hamburger — mobile/tablet only */}
            <button
              type="button"
              id="mobile-menu-button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={[
                'lg:hidden p-1.5 rounded-lg text-text-muted',
                'hover:bg-surface hover:text-text transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
              ].join(' ')}
            >
              {mobileOpen ? (
                <IconClose size={20} aria-hidden="true" />
              ) : (
                <IconMenu size={20} aria-hidden="true" />
              )}
            </button>

            {/* Desktop Expand Sidebar Button — shown in top bar when collapsed */}
            {collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="hidden lg:flex p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-heading transition-colors cursor-pointer shrink-0"
              >
                <IconPanelLeftOpen size={18} aria-hidden="true" />
              </button>
            )}

            {/* Page title */}
            <h1 className="text-base font-semibold text-heading truncate">{title}</h1>

            {/* Header Right Actions: My Queue shortcut + Notifications Bell */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {/* My Queue Quick Pill */}
              <Link
                to="/my-queue"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === '/my-queue'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-surface hover:bg-surface/80 text-text border border-border'
                }`}
                title="Go to My Queue"
              >
                <IconMyQueue size={15} className="shrink-0 text-text-muted" />
                <span className="hidden sm:inline">My Queue</span>
                {queueSummary?.pending > 0 && (
                  <span className="flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-3xs font-bold bg-amber-500 text-white">
                    {queueSummary.pending}
                  </span>
                )}
              </Link>

              {/* Notifications Bell with Floating Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="header-notification-bell"
                  onClick={toggleDropdown}
                  aria-label="Toggle notifications dropdown"
                  title="Notifications"
                  className={`relative p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                    isDropdownOpen
                      ? 'bg-surface text-primary border border-border shadow-2xs'
                      : 'text-text-muted hover:text-heading hover:bg-surface border border-transparent hover:border-border'
                  }`}
                >
                  <IconBell size={19} className="shrink-0" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-3xs font-bold bg-primary text-on-primary shadow-xs ring-2 ring-bg">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Floating Notification Popover Menu */}
                <NotificationDropdown isOpen={isDropdownOpen} onClose={closeDropdown} />
              </div>
            </div>
          </header>

          {/* ── Page content ── */}
          <main ref={mainRef} className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
            {SHOW_FOOTER && <Footer />}
          </main>
        </div>
      </div>
    </div>
  );
}
