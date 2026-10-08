/**
 * SubSidebar.jsx — Reusable, config-driven secondary sidebar & responsive tab navigation.
 *
 * Props:
 *   - items: Array<{ key: string, label: string, shortLabel?: string, icon?: ReactNode, path: string }>
 *   - title?: string (heading for desktop panel, default: 'Document Series')
 *   - className?: string
 */

import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import SearchableSelect from '../ui/SearchableSelect';

export default function SubSidebar({
  items = [],
  title = 'Document Series',
  className = '',
}) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const activeItem =
    items.find((item) => location.pathname.startsWith(item.path)) || items[0];

  const selectOptions = useMemo(() => {
    return items.map((item) => ({
      value: item.path,
      label: `${item.label} (${item.shortLabel || item.key.toUpperCase()})`,
    }));
  }, [items]);

  return (
    <aside className={className}>
      {/* ── Mobile & Tablet (< 1024px): System SearchableSelect Dropdown ── */}
      <div className="lg:hidden w-full mb-3">
        <SearchableSelect
          id="mobile-series-subsidebar"
          value={activeItem?.path || ''}
          onChange={(e) => {
            if (e.target.value) {
              navigate(e.target.value);
            }
          }}
          options={selectOptions}
          placeholder={`Select ${title}...`}
          searchPlaceholder={`Search ${title.toLowerCase()}...`}
          className="w-full font-medium"
        />
      </div>

      {/* ── Desktop (>= 1024px): Fixed-width vertical panel ── */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 bg-bg border border-border rounded-2xl p-3 shadow-2xs">
        {title && (
          <div className="px-3 pt-1.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted select-none border-b border-border/60 mb-2">
            {title}
          </div>
        )}

        <nav aria-label={title} className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={[
                  'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 select-none relative',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
                    : 'text-text-muted hover:bg-surface hover:text-heading',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* Active Left Indicator Pill */}
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
                    aria-hidden="true"
                  />
                )}

                {Icon && (
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.2 : 1.75}
                    className={`shrink-0 transition-transform duration-150 ${
                      isActive
                        ? 'text-primary scale-105'
                        : 'text-text-muted group-hover:text-heading'
                    }`}
                    aria-hidden="true"
                  />
                )}

                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
