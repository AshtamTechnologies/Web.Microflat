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

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconLogout,
  IconPanelLeftClose,
  IconSearch,
} from '../../constants/icons';
import { createPortal } from 'react-dom';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import navigation from '../../config/navigation';
import { Input } from '../ui';
import { useUserSessions } from '../../context/UserSessionsContext';
import { mockUsers } from '../../mocks/users';
import { useAuthContext } from '../../context/AuthContext';
import { hasRolePermission } from '../../constants/roles';

const LOGO = '/micro-flat-logo.png';
const SIDE_LOGO = '/microsidelogo.png';

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
        title={!collapsed ? item.label : undefined}
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

                className={`shrink-0 transition-transform duration-150 ${isActive ? 'text-primary' : 'text-text-muted group-hover/nav-item:text-heading'
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
                      <item.quickAction.icon size={13} />
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
            className="flex items-center gap-2 px-3 py-1.5 bg-heading text-bg text-xs font-semibold rounded-control shadow-dropdown whitespace-nowrap pointer-events-none animate-in fade-in duration-100"
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="px-1.5 py-0.5 bg-primary text-on-primary text-2xs font-bold rounded-badge">
                {item.badge}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ── Submenu Item Active Resolver ────────────────────────────── */
function isSubNavActive(itemPath, currentPath, allSiblingPaths = []) {
  if (!itemPath || !currentPath) return false;
  // Exact match
  if (currentPath === itemPath) return true;

  // If another sibling in the same group has an exact match or a longer/more-specific prefix match,
  // this item should not be marked active.
  if (Array.isArray(allSiblingPaths) && allSiblingPaths.length > 0) {
    const hasMoreSpecificSiblingMatch = allSiblingPaths.some(
      (siblingPath) =>
        siblingPath !== itemPath &&
        (currentPath === siblingPath ||
          (currentPath.startsWith(siblingPath + '/') && siblingPath.length > itemPath.length))
    );
    if (hasMoreSpecificSiblingMatch) {
      return false;
    }
  }

  // Dashboard routes require exact match
  if (itemPath.endsWith('/dashboard')) {
    return currentPath === itemPath;
  }
  // Sub-routes under this section (e.g. /purchase-requisition/create, /purchase-requisition/PR-123)
  // should activate the main list link, but NOT if navigating to the dashboard sibling
  return currentPath.startsWith(itemPath + '/') && !currentPath.startsWith(itemPath + '/dashboard');
}

/* ── Submenu Item (Tree-branch hierarchy) ──────────────────────── */
function SubNavItem({ item, allSiblingPaths, onClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const Icon = item.icon;
  const isActive = isSubNavActive(item.path, location.pathname, allSiblingPaths);

  return (
    <div className="relative group/subnav-item flex items-center">
      {/* Tree branch connector line */}
      <span
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3.5 border-b border-l border-border rounded-bl-lg pointer-events-none"
        aria-hidden="true"
      />

      <Link
        to={item.path}
        title={item.label}
        onClick={onClick}
        className={[
          'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors select-none',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-text-muted hover:bg-surface hover:text-heading',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {Icon && <Icon size={14} className="shrink-0 opacity-80" aria-hidden="true" />}
          <span className="truncate">{item.label}</span>
        </span>

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
              <item.quickAction.icon size={11} />
            </button>
          </div>
        )}
      </Link>
    </div>
  );
}

/* ── Group Item with Accordion or Flyout Popover ─────────────────────────── */
function NavGroup({ item, collapsed, onChildClick, isSearching = false }) {
  const location = useLocation();
  const Icon = item.icon;

  const childPaths = useMemo(() => item.children?.map((c) => c.path) || [], [item.children]);
  const isChildActive = item.children?.some((c) => isSubNavActive(c.path, location.pathname, childPaths));
  const [open, setOpen] = useState(isChildActive);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutCoords, setFlyoutCoords] = useState(null);

  const triggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // When searching or child active, auto-expand the group so matching sub-items are immediately visible
  const isAccordionOpen = open || isSearching || isChildActive;

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
              <div className="px-3.5 py-2.5 border-b border-border bg-surface/70 text-2xs font-bold tracking-wider text-text-muted uppercase flex items-center justify-between">
                <span>{item.label}</span>
                {Icon && <Icon size={13} className="text-text-muted" />}
              </div>

              <div className="p-1.5 space-y-0.5">
                {item.children?.map((child) => {
                  const ChildIcon = child.icon;
                  const isLinkActive = isSubNavActive(child.path, location.pathname, childPaths);

                  return (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      title={child.label}
                      onClick={() => {
                        setIsFlyoutOpen(false);
                        onChildClick?.();
                      }}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        isLinkActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-muted hover:text-heading hover:bg-surface',
                      ].join(' ')}
                    >
                      {ChildIcon && <ChildIcon size={14} className="shrink-0 opacity-80" aria-hidden="true" />}
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
        title={item.label}
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

              className={`shrink-0 ${isChildActive ? 'text-primary' : 'text-text-muted'}`}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{item.label}</span>
        </span>
        {isAccordionOpen ? (
          <IconChevronDown
            size={14}

            className="shrink-0 text-heading transition-colors"
            aria-hidden="true"
          />
        ) : (
          <IconChevronRight
            size={14}

            className="shrink-0 text-text-muted transition-colors"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Submenu Tree-Branch Hierarchy */}
      {isAccordionOpen && (
        <div className="relative mt-1 ml-5 pl-3 border-l border-border/80 space-y-1">
          {item.children.map((child) => (
            <SubNavItem
              key={child.path}
              item={child}
              allSiblingPaths={childPaths}
              onClick={onChildClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar Main Inner Content ───────────────────────────────────────────── */
function SidebarContent({ collapsed, onCollapsedToggle, onChildClick }) {
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

  const navigate = useNavigate();
  const { recordLogout } = useUserSessions();
  const { user: authUser, logout } = useAuthContext();

  const user = useMemo(() => {
    if (authUser) {
      const name = `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || authUser.email || 'User';
      const role = authUser.primaryRole || (authUser.roles?.[0]?.roleName) || 'User';
      return {
        name,
        role,
        email: authUser.email || '',
        roles: authUser.roles || [],
      };
    }
    return {
      name: 'User',
      role: 'User',
      email: '',
      roles: [],
    };
  }, [authUser]);

  async function handleLogout() {
    if (recordLogout) {
      const matched = mockUsers.find(
        (u) =>
          u.email.toLowerCase() === user.email.toLowerCase() ||
          u.firstName === 'Ian' ||
          u.id === 'u1'
      );
      if (matched) {
        recordLogout(matched.id);
      }
    }
    await logout();
  }

  // Filter sections by Role-Based Access Control (RBAC) and inline search
  const filteredSections = useMemo(() => {
    const q = navSearch.trim().toLowerCase();

    return navigation
      .map((sec) => {
        // Filter section items
        const matchingItems = (sec.items || [])
          .map((item) => {
            // RBAC Role Check for parent
            if (item.roles && !hasRolePermission(user.roles, item.roles)) {
              return null;
            }

            // If item has children: filter children by RBAC and search
            if (item.children) {
              const allowedChildren = item.children.filter((child) => {
                if (child.roles && !hasRolePermission(user.roles, child.roles)) {
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
  }, [navSearch, user.roles]);

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* ── Top Header Bar (Brand Logo & Collapse Toggle) ── */}
      <div
        className={[
          'h-14 border-b border-border shrink-0 flex items-center',
          collapsed ? 'justify-center px-2' : 'justify-between px-3.5',
        ].join(' ')}
      >
        {!collapsed ? (
          <>
            <Link
              to="/dashboard"
              onClick={onChildClick}
              title="Go to Dashboard"
              className="flex items-center gap-2 group/logo cursor-pointer"
            >
              <div
                className="inline-flex items-center rounded-lg px-2 py-0.5 group-hover/logo:opacity-90 transition-opacity"
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
                <IconPanelLeftClose size={16} aria-hidden="true" />
              </button>
            )}
          </>
        ) : (
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
        )}
      </div>

      {/* ── Quick Module Search (Expanded mode) ── */}
      {!collapsed && (
        <div className="px-3 pt-2.5 pb-1 shrink-0">
          <Input
              ref={searchInputRef}
              type="search"
              size="sm"
              placeholder="Quick jump..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              leftIcon={<IconSearch size={13} />}
              rightElement={
                <kbd className="px-1.5 py-0.5 text-2xs font-mono font-medium text-text-muted/80 bg-bg border border-border/80 rounded shadow-2xs pointer-events-none">
                  Ctrl K
                </kbd>
              }
            />
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
              <div
                title={sec.section}
                className="px-2 pt-2 pb-1 text-2xs font-bold tracking-wider text-text-muted/80 uppercase truncate"
              >
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
      <div className="border-t border-border p-2.5 bg-surface/30 shrink-0">
        <div
          className={[
            'rounded-xl border border-border/70 bg-surface/40 hover:bg-surface/80 transition-colors p-2',
            collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between gap-2',
          ].join(' ')}
        >
          {/* User Profile Card (Click to view /users/me) */}
          <button
            type="button"
            onClick={() => {
              if (onChildClick) onChildClick();
              navigate('/users/me');
            }}
            title={`View profile (${user.name})`}
            className={[
              'text-left transition-colors cursor-pointer group flex items-center min-w-0',
              collapsed ? 'justify-center p-0.5' : 'flex-1 gap-2.5',
            ].join(' ')}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-primary/25 group-hover:border-primary/60 transition-colors shadow-xs"
                aria-hidden="true"
              >
                {initials(user.name)}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-surface"
                title="Active"
              />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors leading-tight"
                  title={user.name}
                >
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-primary/10 text-primary text-2xs font-semibold rounded whitespace-nowrap leading-none shrink-0">
                    {user.role}
                  </span>
                  {/* <span className="text-2xs text-text-muted truncate group-hover:text-text transition-colors">
                    View profile
                  </span> */}
                </div>
              </div>
            )}
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="p-1.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <IconLogout size={16} aria-hidden="true" />
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
  sidebarWidth = 240,
  onSidebarWidthChange,
  isResizing = false,
  onResizingChange,
}) {
  const location = useLocation();

  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const startResizing = useCallback(
    (e) => {
      if (collapsed) return;
      e.preventDefault();
      onResizingChange?.(true);

      const startX = e.clientX;
      const startW = sidebarWidth;

      function onMouseMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.min(480, Math.max(200, startW + delta));
        onSidebarWidthChange?.(newWidth);
      }

      function onMouseUp() {
        onResizingChange?.(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [collapsed, sidebarWidth, onResizingChange, onSidebarWidthChange]
  );

  const handleDoubleClickResize = () => {
    if (collapsed) return;
    onSidebarWidthChange?.(240);
  };

  return (
    <>
      {/* ── Desktop Fixed Sidebar ── */}
      <aside
        className={[
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30',
          'bg-bg border-r border-border shadow-xs',
          isResizing ? 'transition-none select-none' : 'transition-[width] duration-200 ease-in-out',
        ].join(' ')}
        style={{
          width: collapsed ? '64px' : `${sidebarWidth}px`,
        }}
        aria-label="Sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapsedToggle={onCollapsedToggle}
          onChildClick={undefined}
        />

        {/* Resizer Handle (Desktop only, when expanded) */}
        {!collapsed && (
          <div
            onMouseDown={startResizing}
            onDoubleClick={handleDoubleClickResize}
            title="Drag to resize sidebar • Double-click to reset"
            className={[
              'absolute top-0 -right-1.5 bottom-0 w-3 cursor-col-resize z-40 group select-none',
              'flex items-center justify-center',
            ].join(' ')}
          >
            <div
              className={[
                'w-1 h-full transition-colors duration-150',
                isResizing
                  ? 'bg-primary'
                  : 'group-hover:bg-primary/60 bg-transparent',
              ].join(' ')}
            />
          </div>
        )}
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
