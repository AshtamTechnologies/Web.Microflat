/**
 * ScrollableTabs.jsx — Mobile-optimized, touch-enabled & horizontally scrollable tab bar.
 *
 * Provides:
 *   - Hardware-accelerated smooth momentum touch scrolling (-webkit-overflow-scrolling: touch).
 *   - Desktop mouse-drag scrolling for responsive testing / devtools mode.
 *   - Auto-scroll active tab into view when selected or mounted.
 *   - Left/right scroll navigation buttons when tabs overflow viewport.
 *   - Left/right gradient fade indicators to clearly hint continuation on mobile.
 *   - Two visual styles: 'pills' (rounded button chips) and 'underline' (border-b active line).
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ScrollableTabs({
  tabs = [],
  activeTab,
  value,
  onChange,
  variant = 'underline', // 'underline' | 'pills'
  className = '',
  children,
}) {
  const currentActiveTab = activeTab ?? value;
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mouse drag state for desktop responsive testing
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Check overflow and scroll boundaries
  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = containerRef.current;
    if (!el) return;

    window.addEventListener('resize', updateScrollState);
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }

    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateScrollState, tabs]);

  // Auto-scroll active tab into view whenever active tab changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const activeEl = el.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentActiveTab]);

  // Arrow button click handlers
  const handleScroll = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(160, el.clientWidth * 0.6);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Mouse drag handlers for desktop mouse interaction
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only primary click
    const el = containerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
      el.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleTabClick = (tabId, onClick) => {
    if (hasDraggedRef.current) {
      // Discard click if the user was dragging
      return;
    }
    if (onClick) {
      onClick();
    } else if (onChange) {
      onChange(tabId);
    }
  };

  return (
    <div className={`relative w-full max-w-full min-w-0 ${className}`}>
      {/* Left Scroll Chevron (visible when scrolled right) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-surface/95 border border-border shadow-md flex items-center justify-center text-text-muted hover:text-primary transition-all cursor-pointer backdrop-blur-xs"
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Left Fade Hint */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-1.5 w-6 bg-gradient-to-r from-surface to-transparent pointer-events-none z-10" />
      )}

      {/* Main Horizontally Scrollable Track */}
      <div
        ref={containerRef}
        role="tablist"
        onScroll={updateScrollState}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="mf-scrollable-tabs flex items-center gap-2 border-b border-border pb-1 overflow-x-auto w-full max-w-full min-w-0 touch-pan-x overscroll-x-contain select-none scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children ? (
          children
        ) : (
          tabs.map((tab) => {
            const isActive = currentActiveTab === tab.id;
            const Icon = tab.icon;

            if (variant === 'pills') {
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-active={isActive ? 'true' : 'false'}
                  aria-selected={isActive}
                  disabled={tab.disabled}
                  onClick={() => handleTabClick(tab.id, tab.onClick)}
                  className={`mf-tab-btn flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border'
                  }`}
                >
                  {Icon && <Icon size={15} className="shrink-0" />}
                  <span>{tab.label}</span>
                  {tab.hasError && (
                    <span
                      className="w-2 h-2 rounded-full bg-danger animate-pulse shrink-0"
                      title="Validation errors in this tab"
                    />
                  )}
                  {tab.badge !== undefined && tab.badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md font-mono text-2xs shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-surface text-text-muted border border-border'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            }

            // Default 'underline' variant
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-active={isActive ? 'true' : 'false'}
                aria-selected={isActive}
                disabled={tab.disabled}
                onClick={() => handleTabClick(tab.id, tab.onClick)}
                className={`mf-tab-btn flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-heading hover:border-border'
                }`}
              >
                {Icon && <Icon size={14} className="shrink-0" />}
                <span>{tab.label}</span>
                {tab.hasError && (
                  <span
                    className="w-2 h-2 rounded-full bg-danger animate-pulse shrink-0"
                    title="Validation errors in this tab"
                  />
                )}
                {tab.badge !== undefined && tab.badge !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-2xs font-mono shrink-0 ${
                      isActive
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'bg-surface text-text-muted'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Right Fade Hint */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-1.5 w-6 bg-gradient-to-l from-surface to-transparent pointer-events-none z-10" />
      )}

      {/* Right Scroll Chevron (visible when content extends to the right) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-surface/95 border border-border shadow-md flex items-center justify-center text-text-muted hover:text-primary transition-all cursor-pointer backdrop-blur-xs"
          title="Scroll tabs right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
