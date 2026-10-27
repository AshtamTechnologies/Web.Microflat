import React from 'react';

/**
 * Footer — Centralized elevated card footer for MicroFlat ERP.
 * 
 * Styled as a contained, elevated card that blends with the ERP design tokens.
 * Managed centrally inside AppLayout.
 */
export default function Footer({ className = '' }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={[
        'mt-auto pt-8 pb-2 select-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Footer"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-surface/60 border border-border/80 shadow-2xs backdrop-blur-xs text-xs text-text-muted">
        {/* Left: Brand name & copyright */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="font-semibold text-heading">Micro-Flat Datums</span>
          <span className="text-border" aria-hidden="true">•</span>
          <span>&copy; {currentYear} All rights reserved.</span>
        </div>

        {/* Right: Powered by Ashtam Technologies badge */}
        <div className="flex items-center gap-2">
          <span className="text-text-muted/80">Powered by</span>
          <a
            href="https://ashtamtechnologies.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit Ashtam Technologies"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg border border-border/80 text-heading font-medium hover:border-primary/50 hover:text-primary transition-all duration-150 shadow-2xs group focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform"
              aria-hidden="true"
            />
            <span className="font-semibold">Ashtam Technologies</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
