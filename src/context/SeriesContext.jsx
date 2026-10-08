/**
 * SeriesContext.jsx — Provides shared document series configuration state.
 *
 * Wrap authenticated router subtree with <SeriesProvider>.
 * Consume with useSeriesContext().
 */

import { createContext, useContext } from 'react';
import { useSeries } from '../pages/configuration/useSeries';

const SeriesContext = createContext(null);

export function SeriesProvider({ children }) {
  const value = useSeries();
  return <SeriesContext.Provider value={value}>{children}</SeriesContext.Provider>;
}

export function useSeriesContext() {
  const ctx = useContext(SeriesContext);
  if (!ctx) {
    throw new Error('useSeriesContext must be used within a <SeriesProvider>');
  }
  return ctx;
}
