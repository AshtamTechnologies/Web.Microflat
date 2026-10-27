import React, { useState, useEffect, useRef, cloneElement, isValidElement } from 'react';
import { createPortal } from 'react-dom';

/**
 * GlobalTooltip
 * 
 * Centralized, theme-styled tooltip engine for the entire application.
 * 
 * Features:
 *   1. Captures native `title="..."` and dedicated `data-tooltip="..."` attributes.
 *   2. Ancestor Title Stashing: Stashes and strips `title` attributes on both the hovered
 *      element and any parent elements (e.g. <NavLink>, <button>), preventing the browser's
 *      native yellow tooltip from ever firing alongside the custom UI tooltip.
 *   3. Deduplication: Resolves nested parent-child titles into a single unified tooltip.
 *   4. Edge Collision Detection: Auto-flips (top/bottom/left/right) near viewport edges.
 *   5. Smooth 100ms debounce and instant dismissal on click, scroll, or escape.
 */
export default function GlobalTooltip() {
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0,
    placement: 'top',
  });

  const activeTargetRef = useRef(null);
  const stashedElementsRef = useRef([]);
  const showTimerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Restore all stashed native titles
  const restoreAllTitles = () => {
    if (stashedElementsRef.current.length > 0) {
      stashedElementsRef.current.forEach((el) => {
        try {
          const original = el.getAttribute('data-original-title');
          if (original !== null) {
            el.setAttribute('title', original);
            el.removeAttribute('data-original-title');
          }
        } catch {
          /* ignore */
        }
      });
      stashedElementsRef.current = [];
    }
  };

  const hide = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    restoreAllTitles();
    activeTargetRef.current = null;
    setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  useEffect(() => {
    function computePosition(targetEl, content, preferredPos = 'top') {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const gap = 8;
      let placement = preferredPos;

      const tooltipW = tooltipRef.current ? tooltipRef.current.offsetWidth : 140;
      const tooltipH = tooltipRef.current ? tooltipRef.current.offsetHeight : 32;

      // Flip on boundary collisions
      if (placement === 'top' && rect.top - tooltipH - gap < 4) {
        placement = 'bottom';
      } else if (placement === 'bottom' && rect.bottom + tooltipH + gap > window.innerHeight - 4) {
        placement = 'top';
      } else if (placement === 'left' && rect.left - tooltipW - gap < 4) {
        placement = 'right';
      } else if (placement === 'right' && rect.right + tooltipW + gap > window.innerWidth - 4) {
        placement = 'left';
      }

      let x = 0;
      let y = 0;

      if (placement === 'top') {
        x = rect.left + rect.width / 2;
        y = rect.top - gap;
      } else if (placement === 'bottom') {
        x = rect.left + rect.width / 2;
        y = rect.bottom + gap;
      } else if (placement === 'left') {
        x = rect.left - gap;
        y = rect.top + rect.height / 2;
      } else if (placement === 'right') {
        x = rect.right + gap;
        y = rect.top + rect.height / 2;
      }

      // Clamp X within viewport
      const minX = tooltipW / 2 + 8;
      const maxX = window.innerWidth - tooltipW / 2 - 8;
      if (placement === 'top' || placement === 'bottom') {
        x = Math.max(minX, Math.min(maxX, x));
      }

      setTooltipState({
        visible: true,
        content,
        x,
        y,
        placement,
      });
    }

    function handlePointerOver(e) {
      // Find all elements in the chain up to document body that have tooltip or title
      let curr = e.target;
      const elementsWithTooltip = [];

      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (
          curr.hasAttribute?.('data-tooltip') ||
          curr.hasAttribute?.('title') ||
          curr.hasAttribute?.('data-original-title')
        ) {
          elementsWithTooltip.push(curr);
        }
        curr = curr.parentElement;
      }

      if (elementsWithTooltip.length === 0) return;

      // If we are already displaying/hovering inside the active target tree, do nothing
      if (
        activeTargetRef.current &&
        (activeTargetRef.current.contains(e.target) || e.target.contains(activeTargetRef.current))
      ) {
        return;
      }

      // If moving to a completely new target, hide previous
      if (activeTargetRef.current && !activeTargetRef.current.contains(e.target)) {
        hide();
      }

      // Determine content: prefer dedicated data-tooltip or the outermost/innermost title
      let content = '';
      let preferredPos = 'top';
      let primaryTarget = elementsWithTooltip[0];

      // Stash and strip native title on ALL elements in the ancestry to prevent native browser tooltip leak
      elementsWithTooltip.forEach((el) => {
        const dataTip = el.getAttribute('data-tooltip');
        const title = el.getAttribute('title');
        const origTitle = el.getAttribute('data-original-title');

        if (dataTip && !content) {
          content = dataTip.trim();
          primaryTarget = el;
        } else if (title && title.trim()) {
          if (!content) content = title.trim();
          el.setAttribute('data-original-title', title);
          el.removeAttribute('title'); // Suppress browser native tooltip
          stashedElementsRef.current.push(el);
        } else if (origTitle && !content) {
          content = origTitle.trim();
        }

        const pos = el.getAttribute('data-tooltip-pos');
        if (pos) preferredPos = pos;
      });

      // If content was found on an interactive parent (a, button), anchor position to that container
      const interactiveParent = elementsWithTooltip.find((el) =>
        ['BUTTON', 'A'].includes(el.tagName)
      );
      if (interactiveParent) {
        primaryTarget = interactiveParent;
      }

      if (!content || !content.trim()) return;

      activeTargetRef.current = primaryTarget;

      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => {
        if (activeTargetRef.current === primaryTarget) {
          computePosition(primaryTarget, content, preferredPos);
        }
      }, 100);
    }

    function handlePointerOut(e) {
      if (!activeTargetRef.current) return;
      // If moving into a child or parent in the same active element chain, do not hide
      if (
        e.relatedTarget &&
        (activeTargetRef.current.contains(e.relatedTarget) ||
          e.relatedTarget.contains?.(activeTargetRef.current))
      ) {
        return;
      }
      hide();
    }

    function handleWindowEvents() {
      hide();
    }

    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });
    document.addEventListener('click', handleWindowEvents, { passive: true });
    document.addEventListener('scroll', handleWindowEvents, { passive: true, capture: true });
    window.addEventListener('blur', handleWindowEvents);
    window.addEventListener('resize', handleWindowEvents);

    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('click', handleWindowEvents);
      document.removeEventListener('scroll', handleWindowEvents, true);
      window.removeEventListener('blur', handleWindowEvents);
      window.removeEventListener('resize', handleWindowEvents);
      hide();
    };
  }, []);

  if (!tooltipState.visible || !tooltipState.content) return null;

  const isTop = tooltipState.placement === 'top';
  const isBottom = tooltipState.placement === 'bottom';
  const isLeft = tooltipState.placement === 'left';
  const isRight = tooltipState.placement === 'right';

  let translateStyle = '-translate-x-1/2 -translate-y-full';
  if (isBottom) translateStyle = '-translate-x-1/2 translate-y-0';
  if (isLeft) translateStyle = '-translate-x-full -translate-y-1/2';
  if (isRight) translateStyle = 'translate-x-0 -translate-y-1/2';

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: `${tooltipState.x}px`,
        top: `${tooltipState.y}px`,
        zIndex: 999999,
      }}
      className={[
        'pointer-events-none select-none transition-all duration-150 ease-out',
        translateStyle,
        'animate-in fade-in zoom-in-95',
      ].join(' ')}
    >
      <div className="relative flex items-center px-2.5 py-1.5 rounded-lg bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs font-medium tracking-normal shadow-dropdown border border-white/10 backdrop-blur-md max-w-xs break-words text-center leading-snug">
        {tooltipState.content}

        {/* Arrow pointer */}
        {isTop && (
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900/95 dark:border-t-gray-800/95"
            aria-hidden="true"
          />
        )}
        {isBottom && (
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900/95 dark:border-b-gray-800/95"
            aria-hidden="true"
          />
        )}
        {isLeft && (
          <span
            className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-gray-900/95 dark:border-l-gray-800/95"
            aria-hidden="true"
          />
        )}
        {isRight && (
          <span
            className="absolute top-1/2 -translate-y-1/2 right-full w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-gray-900/95 dark:border-r-gray-800/95"
            aria-hidden="true"
          />
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Tooltip wrapper component (Optional helper)
 */
export function Tooltip({ children, content, position = 'top' }) {
  if (!content) return children;

  if (isValidElement(children)) {
    return cloneElement(children, {
      'data-tooltip': content,
      'data-tooltip-pos': position,
    });
  }

  return (
    <span data-tooltip={content} data-tooltip-pos={position} className="inline-flex">
      {children}
    </span>
  );
}
