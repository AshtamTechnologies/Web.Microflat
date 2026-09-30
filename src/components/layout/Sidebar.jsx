/**
 * Sidebar — Enhanced ERP Navigation Sidebar for MicroFlat.
 *
 * Features:
 *   - Config-driven from src/config/navigation.js
 *   - Category Section Grouping (MAIN, PROCUREMENT, ADMINISTRATION)
 *   - Real-time Quick Module Search
 *   - Role-Based Access Control (RBAC) filtering
 *   - Live Count Badges (e.g. Vendors [6])
 *   - 1-Click Quick-Add (+) action on hover
 *   - Active state vertical indicator pill & glowing tint
 *   - Collapsible desktop rail mode (w-16) with floating popovers / tooltips
 *   - Mobile off-canvas drawer with smooth backdrop
 *   - Rich user card with Role badge & live connection status
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';
import navigation from '../../config/navigation';

const LOGO = '/micro-flat-logo.png';
const SIDE_LOGO = '/microsidelogo.png';
const COLLAPSED_KEY = 'mf-sidebar-collapsed';

function getInitialCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ── Single Nav Item (Leaf) ────────────────────────────────────────────────── */
function NavItem({ item, collapsed, onClick }) {
  const Icon = item.icon;
  const navigate = useNavigate();
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
      className={collapsed ? 'relative flex justify-center' : 'relative group/nav-item'}
    >
      <NavLink
        to={item.path}
        end={item.path === '/dashboard' || item.path === '/'}
        onClick={onClick}
        className={({ isActive }) =>
          [
            'flex items-center gap-2.5 rounded-xl text-sm font-medium relative',
            'transition-all duration-150 ease-in-out select-none',
            isActive
              ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
              : 'text-text-muted hover:bg-surface hover:text-heading',
            collapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-3 py-2',
          ]
            .filter(Boolean)
            .join(' ')
        }
      >
        {({ isActive }) => (
          <>
            {/* Active Left Indicator Bar */}
            {isActive && !collapsed && (
              <span
                className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
                aria-hidden="true"
              />
            )}

            {/* Icon (Image or Component) */}
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className={`${collapsed ? 'w-7 h-7' : 'w-5.5 h-5.5'} object-contain shrink-0`}
                aria-hidden="true"
              />
            ) : Icon ? (
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.75}
                className={`shrink-0 transition-transform duration-150 ${
                  isActive ? 'text-primary' : 'text-text-muted group-hover/nav-item:text-heading'
                }`}
                aria-hidden="true"
              />
            ) : null}

            {!collapsed && (
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="truncate">{item.label}</span>

                {item.quickAction && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(item.quickAction.path);
                        onClick?.();
                      }}
                      title={item.quickAction.title}
                      className="opacity-0 group-hover/nav-item:opacity-100 transition-opacity p-0.5 hover:bg-primary hover:text-white rounded-md text-text-muted cursor-pointer"
                    >
                      <item.quickAction.icon size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </NavLink>

      {/* Tooltip in Collapsed Rail Mode */}
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
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in duration-100"
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="px-1.5 py-0.2 bg-primary text-white text-[10px] font-bold rounded-full">
                {item.badge}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ── Submenu Item (Tree-branch hierarchy without icon) ──────────────────────── */
function SubNavItem({ item, onClick }) {
  const navigate = useNavigate();

  return (
    <div className="relative group/subnav-item flex items-center">
      {/* Tree branch connector line */}
      <span
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3.5 border-b border-l border-border rounded-bl-lg pointer-events-none"
        aria-hidden="true"
      />

      <NavLink
        to={item.path}
        onClick={onClick}
        className={({ isActive }) =>
          [
            'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors select-none',
            isActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-text-muted hover:bg-surface hover:text-heading',
          ].join(' ')}
      >
        <span className="truncate">{item.label}</span>

        {item.quickAction && (
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(item.quickAction.path);
                onClick?.();
              }}
              title={item.quickAction.title}
              className="opacity-0 group-hover/subnav-item:opacity-100 transition-opacity p-0.5 hover:bg-primary hover:text-white rounded text-text-muted cursor-pointer"
            >
              <item.quickAction.icon size={11} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </NavLink>
    </div>
  );
}

/* ── Group Item with Accordion or Flyout Popover ─────────────────────────── */
function NavGroup({ item, collapsed, onChildClick, isSearching = false }) {
  const location = useLocation();
  const Icon = item.icon;

  const isChildActive = item.children?.some((c) => location.pathname.startsWith(c.path));
  const [open, setOpen] = useState(isChildActive);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutCoords, setFlyoutCoords] = useState(null);

  const triggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  // When searching, auto-expand the group so matching sub-items are immediately visible
  const isAccordionOpen = open || isSearching;

  function handleToggle() {
    if (!collapsed) setOpen((prev) => !prev);
  }

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

  // Collapsed Mode: Hover Floating Popover
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
            'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium',
            'transition-colors duration-150 ease-in-out cursor-pointer',
            isChildActive
              ? 'bg-primary/10 text-primary'
              : isFlyoutOpen
              ? 'bg-surface text-heading'
              : 'text-text-muted hover:bg-surface hover:text-heading',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="w-7 h-7 object-contain shrink-0"
              aria-hidden="true"
            />
          ) : Icon ? (
            <Icon
              size={18}
              strokeWidth={isChildActive ? 2.2 : 1.75}
              className="shrink-0"
              aria-hidden="true"
            />
          ) : null}
        </button>

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
              className="w-56 bg-bg border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3.5 py-2.5 border-b border-border bg-surface/70 text-[10.5px] font-bold tracking-wider text-text-muted uppercase flex items-center justify-between">
                <span>{item.label}</span>
                {Icon && <Icon size={13} className="text-text-muted" />}
              </div>

              <div className="p-1.5 space-y-0.5">
                {item.children?.map((child) => {
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
                        'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        isLinkActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-muted hover:text-heading hover:bg-surface',
                      ].join(' ')}
                    >
                      <span className="truncate">{child.label}</span>
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

  // Expanded Mode: Accordion Group
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isAccordionOpen}
        className={[
          'w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium',
          'transition-all duration-150 ease-in-out cursor-pointer select-none',
          isChildActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-text-muted hover:bg-surface hover:text-heading',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="flex items-center gap-2 truncate">
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="w-5.5 h-5.5 object-contain shrink-0"
              aria-hidden="true"
            />
          ) : Icon ? (
            <Icon
              size={18}
              strokeWidth={isChildActive ? 2.2 : 1.75}
              className={`shrink-0 ${isChildActive ? 'text-primary' : 'text-text-muted'}`}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{item.label}</span>
        </span>
        {isAccordionOpen ? (
          <ChevronDown
            size={14}
            strokeWidth={2}
            className="shrink-0 text-heading transition-colors"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            size={14}
            strokeWidth={2}
            className="shrink-0 text-text-muted transition-colors"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Submenu Tree-Branch Hierarchy */}
      {isAccordionOpen && (
        <div className="relative mt-1 ml-5 pl-3 border-l border-border/80 space-y-1">
          {item.children.map((child) => (
            <SubNavItem key={child.path} item={child} onClick={onChildClick} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar Main Inner Content ───────────────────────────────────────────── */
function SidebarContent({ collapsed, onCollapsedToggle, onChildClick }) {
  const navigate = useNavigate();
  const [navSearch, setNavSearch] = useState('');
  const searchInputRef = useRef(null);

  // Global Ctrl+K / Cmd+K shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // If sidebar is collapsed on desktop, expand it first
        if (collapsed && onCollapsedToggle) {
          onCollapsedToggle();
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 60);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, onCollapsedToggle]);

  function handleLogout() {
    localStorage.removeItem('mf-token');
    sessionStorage.removeItem('mf-token');
    navigate('/login', { replace: true });
  }

  // Active user data
  const user = {
    name: 'Ian Chesnut',
    role: 'Admin',
    email: 'admin@microflat.in',
  };

  // Filter sections by Role-Based Access Control (RBAC) and inline search
  const filteredSections = useMemo(() => {
    const q = navSearch.trim().toLowerCase();

    return navigation
      .map((sec) => {
        // Filter section items
        const matchingItems = (sec.items || [])
          .map((item) => {
            // RBAC Role Check for parent
            if (item.roles && !item.roles.includes(user.role.toUpperCase())) {
              return null;
            }

            // If item has children: filter children by RBAC and search
            if (item.children) {
              const allowedChildren = item.children.filter((child) => {
                if (child.roles && !child.roles.includes(user.role.toUpperCase())) {
                  return false;
                }
                return true;
              });

              if (allowedChildren.length === 0) return null;

              if (q) {
                const matchesParent = item.label.toLowerCase().includes(q);
                const matchingChildren = allowedChildren.filter((child) =>
                  child.label.toLowerCase().includes(q)
                );

                if (matchesParent) {
                  return { ...item, children: allowedChildren };
                } else if (matchingChildren.length > 0) {
                  return { ...item, children: matchingChildren };
                }
                return null;
              }

              return { ...item, children: allowedChildren };
            }

            // Single item (leaf)
            if (q) {
              const matches = item.label.toLowerCase().includes(q);
              return matches ? item : null;
            }

            return item;
          })
          .filter(Boolean);

        return {
          ...sec,
          items: matchingItems,
        };
      })
      .filter((sec) => sec.items.length > 0);
  }, [navSearch, user.role]);

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* ── Top Header Bar (Brand Logo & Collapse Toggle) ── */}
      <div className="border-b border-border p-3.5 shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              onClick={onChildClick}
              title="Go to Dashboard"
              className="flex items-center gap-2 group/logo cursor-pointer"
            >
              <div
                className="inline-flex items-center rounded-lg px-2 py-1 group-hover/logo:opacity-90 transition-opacity"
                style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
              >
                <img
                  src={LOGO}
                  alt="Micro-Flat Datums"
                  className="h-6 w-auto object-contain"
                  draggable={false}
                />
              </div>
            </Link>

            {/* Desktop Collapse Toggle */}
            {onCollapsedToggle && (
              <button
                type="button"
                onClick={onCollapsedToggle}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-heading transition-colors cursor-pointer"
              >
                <PanelLeftClose size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {/* Collapsed Logo (microsidelogo.png) */}
            <Link
              to="/dashboard"
              onClick={onChildClick}
              title="Go to Dashboard"
              aria-label="Go to Dashboard"
              className="p-1 rounded-xl hover:bg-surface transition-all cursor-pointer group/logo flex items-center justify-center"
            >
              <img
                src={SIDE_LOGO}
                alt="Micro-Flat"
                className="w-8 h-8 object-contain group-hover/logo:scale-105 transition-transform"
                draggable={false}
              />
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Module Search (Expanded mode) ── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Quick jump..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full pl-8 pr-14 py-1.5 text-xs rounded-lg bg-surface/80 border border-border text-heading placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-text-muted/80 bg-bg border border-border/80 rounded shadow-2xs pointer-events-none">
              Ctrl K
            </kbd>
          </div>
        </div>
      )}

      {/* ── Navigation Sections List ── */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto py-2 px-2.5 space-y-4"
      >
        {filteredSections.map((sec, sIdx) => (
          <div key={sec.section || sIdx} className="space-y-1">
            {/* Section Category Title */}
            {!collapsed && sec.section && (
              <div className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-text-muted/80 uppercase">
                {sec.section}
              </div>
            )}
            {collapsed && sIdx > 0 && (
              <div className="my-2 border-t border-border/80 w-6 mx-auto" />
            )}

            {/* Section Items */}
            <div className="space-y-0.5">
              {sec.items.map((item) =>
                item.children ? (
                  <NavGroup
                    key={item.label}
                    item={item}
                    collapsed={collapsed}
                    onChildClick={onChildClick}
                    isSearching={Boolean(navSearch.trim())}
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
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="py-6 px-3 text-center text-xs text-text-muted">
            No matching menus
          </div>
        )}
      </nav>

      {/* ── User Profile & System Status Footer ── */}
      <div className="border-t border-border p-3 bg-surface/30 shrink-0">
        <div
          className={[
            collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2.5',
          ].join(' ')}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 border border-primary/20"
            aria-hidden="true"
          >
            {initials(user.name)}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-heading truncate">{user.name}</p>
                <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[9.5px] font-bold rounded-md">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                <span className="truncate">Connected (Live)</span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="p-1.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Public Export ────────────────────────────────────────────────────────── */
export default function Sidebar({
  isOpen,
  onClose,
  collapsed = false,
  onCollapsedToggle,
}) {
  const location = useLocation();

  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── Desktop Fixed Sidebar ── */}
      <aside
        className={[
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30',
          'bg-bg border-r border-border shadow-xs',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
        aria-label="Sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapsedToggle={onCollapsedToggle}
          onChildClick={undefined}
        />
      </aside>

      {/* ── Mobile Off-Canvas Drawer ── */}
      <div
        className={[
          'fixed inset-0 z-40 bg-heading/40 backdrop-blur-xs lg:hidden',
          'transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden="true"
        onClick={onClose}
      />

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
