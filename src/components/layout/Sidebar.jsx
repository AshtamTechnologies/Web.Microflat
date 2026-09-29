/**
 * Sidebar — config-driven, accordion-expandable navigation sidebar.
 *
 * Desktop (>=1024px):
 *   Fixed left rail, collapsible to icon-only mode. State stored in localStorage.
 *
 * Mobile/tablet (<1024px):
 *   Off-canvas drawer over a backdrop. Closed on route change or backdrop click.
 *   Triggered from the top bar hamburger button (passed as `isOpen`/`onClose` props).
 *
 * Reads navigation from src/config/navigation.js — never hardcode items here.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import navigation from '../../config/navigation';

const LOGO = '/micro-flat-logo.png';
const COLLAPSED_KEY = 'mf-sidebar-collapsed';

function getInitialCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/* ── Avatar initials helper ───────────────────────────────────────────────── */
function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ── Single nav item (leaf) ───────────────────────────────────────────────── */
function NavItem({ item, collapsed, onClick }) {
  const Icon = item.icon;
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  function handleMouseEnter() {
    if (!collapsed) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
      setIsHovered(true);
    }
  }

  function handleMouseLeave() {
    if (!collapsed) return;
    setIsHovered(false);
  }

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={collapsed ? 'relative flex justify-center' : ''}
    >
      <NavLink
        to={item.path}
        end={item.path === '/dashboard' || item.path === '/'}
        onClick={onClick}
        className={({ isActive }) =>
          [
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
            'transition-colors duration-150 ease-in-out group',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:bg-surface hover:text-text',
            collapsed ? 'w-10 h-10 justify-center p-0' : 'w-full',
          ]
            .filter(Boolean)
            .join(' ')
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              size={18}
              strokeWidth={isActive ? 2 : 1.75}
              className="shrink-0"
              aria-hidden="true"
            />
            {!collapsed && <span>{item.label}</span>}
          </>
        )}
      </NavLink>

      {/* Single Item Tooltip in collapsed mode */}
      {collapsed &&
        isHovered &&
        coords &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: 'translateY(-50%)',
              zIndex: 99999,
            }}
            className="px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in duration-100"
          >
            {item.label}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ── Parent item with accordion children / flyout popover ─────────────────── */
function NavGroup({ item, collapsed, onChildClick }) {
  const location = useLocation();
  const Icon = item.icon;

  // Determine if any child is currently active
  const isChildActive = item.children?.some((c) => location.pathname.startsWith(c.path));

  // Expand by default if a child is active; persist open state in full mode
  const [open, setOpen] = useState(isChildActive);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutCoords, setFlyoutCoords] = useState(null);

  const triggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Keep open when navigating to a child from elsewhere
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  function handleToggle() {
    if (!collapsed) setOpen((prev) => !prev);
  }

  /* ── Hover handlers for Collapsed Rail Flyout ── */
  function handleMouseEnter() {
    if (!collapsed) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setFlyoutCoords({
        top: Math.max(12, rect.top - 4),
        left: rect.right + 8,
      });
      setIsFlyoutOpen(true);
    }
  }

  function handleMouseLeave() {
    if (!collapsed) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsFlyoutOpen(false);
    }, 150);
  }

  function handleFlyoutMouseEnter() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function handleFlyoutMouseLeave() {
    closeTimeoutRef.current = setTimeout(() => {
      setIsFlyoutOpen(false);
    }, 150);
  }

  // When collapsed to rail mode: render icon button with floating popover
  if (collapsed) {
    return (
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex justify-center"
      >
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isFlyoutOpen}
          className={[
            'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium',
            'transition-colors duration-150 ease-in-out cursor-pointer',
            isChildActive
              ? 'bg-primary/10 text-primary'
              : isFlyoutOpen
              ? 'bg-surface text-text'
              : 'text-text-muted hover:bg-surface hover:text-text',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Icon
            size={18}
            strokeWidth={isChildActive ? 2 : 1.75}
            className="shrink-0"
            aria-hidden="true"
          />
        </button>

        {/* Floating Flyout Menu Popup */}
        {isFlyoutOpen &&
          flyoutCoords &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: `${flyoutCoords.top}px`,
                left: `${flyoutCoords.left}px`,
                zIndex: 99999,
              }}
              onMouseEnter={handleFlyoutMouseEnter}
              onMouseLeave={handleFlyoutMouseLeave}
              className="w-52 bg-bg border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            >
              {/* Flyout Header */}
              <div className="px-4 py-2.5 border-b border-border bg-surface/70 text-[10.5px] font-bold tracking-wider text-text-muted uppercase">
                {item.label}
              </div>

              {/* Child Links */}
              <div className="p-1.5 space-y-0.5">
                {item.children?.map((child) => {
                  const ChildIcon = child.icon;
                  const isLinkActive = location.pathname.startsWith(child.path);

                  return (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={() => {
                        setIsFlyoutOpen(false);
                        onChildClick?.();
                      }}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        isLinkActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-muted hover:text-heading hover:bg-surface',
                      ].join(' ')}
                    >
                      {ChildIcon && (
                        <ChildIcon
                          size={14}
                          strokeWidth={isLinkActive ? 2 : 1.75}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>{child.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className={[
          'w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
          'transition-colors duration-150 ease-in-out',
          'cursor-pointer',
          isChildActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-muted hover:bg-surface hover:text-text',
        ]
          .filter(Boolean)
          .join(' ')}
        title={item.label}
      >
        <span className="flex items-center gap-3">
          <Icon
            size={18}
            strokeWidth={isChildActive ? 2 : 1.75}
            className="shrink-0"
            aria-hidden="true"
          />
          {item.label}
        </span>
        <ChevronDown
          size={14}
          className={[
            'shrink-0 transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {/* Accordion children in expanded mode */}
      {open && (
        <div className="mt-0.5 ml-5 pl-3 border-l border-border space-y-0.5">
          {item.children.map((child) => (
            <NavItem key={child.path} item={child} collapsed={false} onClick={onChildClick} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar inner content ────────────────────────────────────────────────── */
function SidebarContent({ collapsed, onCollapsedToggle, onChildClick }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('mf-token');
    sessionStorage.removeItem('mf-token');
    navigate('/login', { replace: true });
  }

  // Mock user from token / fallback
  const user = { name: 'Admin', email: 'admin@microflat.in' };

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div
        className={[
          'flex items-center border-b border-border',
          collapsed ? 'justify-center p-4' : 'justify-between px-4 py-4',
        ].join(' ')}
      >
        {!collapsed && (
          <div className="flex flex-col gap-0.5">
            <div
              className="inline-flex items-center rounded-lg px-2.5 py-1.5 self-start"
              style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
            >
              <img
                src={LOGO}
                alt="Micro-Flat Datums Pvt. Ltd."
                className="h-6 w-auto object-contain"
                draggable={false}
              />
            </div>
            {/* <span
              className="text-[10px] tracking-widest uppercase pl-0.5"
              style={{ color: 'var(--brand-500)', opacity: 0.75 }}
            >
              ERP System
            </span> */}
          </div>
        )}

        {/* Collapse / expand toggle (desktop only) */}
        {onCollapsedToggle && (
          <button
            type="button"
            onClick={onCollapsedToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={[
              'p-1.5 rounded-lg text-text-muted',
              'hover:bg-surface hover:text-text',
              'transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
            ].join(' ')}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={17} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
      >
        {navigation.map((item) =>
          item.children ? (
            <NavGroup
              key={item.label}
              item={item}
              collapsed={collapsed}
              onChildClick={onChildClick}
            />
          ) : (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              onClick={onChildClick}
            />
          )
        )}
      </nav>

      {/* ── User footer ── */}
      <div
        className={[
          'border-t border-border p-3',
          collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3',
        ].join(' ')}
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {initials(user.name)}
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          className={[
            'p-1.5 rounded-lg text-text-muted shrink-0',
            'hover:bg-danger/10 hover:text-danger',
            'transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-danger',
          ].join(' ')}
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ── Public component ─────────────────────────────────────────────────────── */
export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  // Desktop collapsed state (persisted)
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
        window.dispatchEvent(new Event('mf-sidebar-toggle'));
      } catch { /* ignore */ }
      return next;
    });
  }

  // Close mobile drawer on route change
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── Desktop fixed sidebar ── */}
      <aside
        className={[
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30',
          'bg-bg border-r border-border',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
        aria-label="Sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapsedToggle={toggleCollapsed}
          onChildClick={undefined}
        />
      </aside>

      {/* ── Mobile off-canvas drawer ── */}
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-heading/40 backdrop-blur-sm lg:hidden',
          'transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden',
          'bg-bg border-r border-border shadow-xl',
          'transition-transform duration-250 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Mobile navigation"
      >
        <SidebarContent
          collapsed={false}
          onCollapsedToggle={null}
          onChildClick={onClose}
        />
      </aside>
    </>
  );
}
