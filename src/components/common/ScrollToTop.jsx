import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — scrolls window, document, and layout containers to the top
 * on every page navigation or redirect.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Scroll window and document elements
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // 2. Scroll any inner scrollable containers (e.g. <main>)
    const scrollContainers = document.querySelectorAll('main, [data-scroll-container="true"]');
    scrollContainers.forEach((el) => {
      try {
        el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        /* fallback for older browsers */
      }
      el.scrollTop = 0;
    });
  }, [pathname, search]);

  return null;
}
