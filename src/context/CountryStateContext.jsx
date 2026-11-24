/**
 * src/context/CountryStateContext.jsx — Central Context & Cache for live Countries and States.
 *
 * Responsibilities:
 *   - Fetches active countries on initial mount and caches them in memory.
 *   - Fetches and caches states per countryId on demand (avoids repeated API calls).
 *   - Formats dropdown options: { value: id, label: name }.
 *   - Provides synchronous getCountryName() & getStateName() lookup helpers.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { geographyService } from '../services';

export const DEFAULT_FALLBACK_COUNTRIES = [
  { id: 1, countryName: 'India', isActive: true, stateCount: 36 },
  { id: 2, countryName: 'United States', isActive: true, stateCount: 50 },
  { id: 3, countryName: 'Germany', isActive: true, stateCount: 16 },
  { id: 4, countryName: 'United Kingdom', isActive: true, stateCount: 4 },
  { id: 5, countryName: 'United Arab Emirates', isActive: true, stateCount: 7 },
  { id: 6, countryName: 'Qatar', isActive: true, stateCount: 8 },
  { id: 7, countryName: 'Saudi Arabia', isActive: true, stateCount: 13 },
  { id: 8, countryName: 'Australia', isActive: true, stateCount: 8 },
  { id: 9, countryName: 'Canada', isActive: true, stateCount: 13 },
  { id: 10, countryName: 'Japan', isActive: true, stateCount: 47 },
  { id: 11, countryName: 'Singapore', isActive: true, stateCount: 1 },
];

export const DEFAULT_INDIAN_STATES = [
  { id: 1, countryId: 1, stateName: 'Gujarat', isActive: true },
  { id: 2, countryId: 1, stateName: 'Maharashtra', isActive: true },
  { id: 3, countryId: 1, stateName: 'Karnataka', isActive: true },
  { id: 4, countryId: 1, stateName: 'Tamil Nadu', isActive: true },
  { id: 5, countryId: 1, stateName: 'Delhi', isActive: true },
  { id: 6, countryId: 1, stateName: 'Rajasthan', isActive: true },
  { id: 7, countryId: 1, stateName: 'Uttar Pradesh', isActive: true },
  { id: 8, countryId: 1, stateName: 'Haryana', isActive: true },
  { id: 9, countryId: 1, stateName: 'Madhya Pradesh', isActive: true },
  { id: 10, countryId: 1, stateName: 'Telangana', isActive: true },
  { id: 11, countryId: 1, stateName: 'Andhra Pradesh', isActive: true },
  { id: 12, countryId: 1, stateName: 'West Bengal', isActive: true },
  { id: 13, countryId: 1, stateName: 'Punjab', isActive: true },
  { id: 14, countryId: 1, stateName: 'Kerala', isActive: true },
  { id: 15, countryId: 1, stateName: 'Odisha', isActive: true },
];

const CountryStateContext = createContext(null);

export function CountryStateProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/clients') ||
    location?.pathname?.startsWith('/vendors') ||
    location?.pathname?.startsWith('/company') ||
    location?.pathname?.startsWith('/inquiries') ||
    location?.pathname?.startsWith('/quotations') ||
    location?.pathname?.startsWith('/sales-orders') ||
    location?.pathname?.startsWith('/deals')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureCountriesLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [countries, setCountries] = useState([]);
  const [statesCache, setStatesCache] = useState({}); // { [countryId]: Array<State> }
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [loadingStatesMap, setLoadingStatesMap] = useState({}); // { [countryId]: boolean }

  // Load countries once when on a relevant route or explicitly requested
  const loadCountries = useCallback(async () => {
    setIsLoadingCountries(true);
    try {
      const data = await geographyService.listCountries({ isActive: true });
      if (Array.isArray(data) && data.length > 0) {
        setCountries(data);
      } else {
        setCountries(DEFAULT_FALLBACK_COUNTRIES);
      }
    } catch (err) {
      console.warn('CountryStateProvider: Failed to load countries from API, using default list', err);
      setCountries(DEFAULT_FALLBACK_COUNTRIES);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldFetch) return;
    if (countries.length === 0) {
      loadCountries();
    }
  }, [shouldFetch, countries.length, loadCountries]);

  // Formatted dropdown options for countries: { value: c.id, label: c.countryName }
  const countryOptions = useMemo(() => {
    return countries.map((c) => ({
      value: c.id,
      label: c.countryName,
    }));
  }, [countries]);

  // Fetch and cache states for a specific country
  const fetchStatesForCountry = useCallback(
    async (countryId) => {
      if (!countryId) return [];
      let numericId = typeof countryId === 'number' ? countryId : parseInt(countryId, 10);
      if (isNaN(numericId) || !numericId) {
        const str = String(countryId).trim();
        const found = countries.find(
          (c) =>
            String(c.id) === str ||
            c.countryName?.toLowerCase() === str.toLowerCase() ||
            (str.toUpperCase() === 'IN' && c.countryName?.toLowerCase() === 'india')
        );
        numericId = found ? found.id : (str.toUpperCase() === 'IN' ? 2 : countryId);
      }
      const key = String(numericId);

      // Return immediately if already cached
      if (statesCache[key]) {
        return statesCache[key];
      }

      setLoadingStatesMap((prev) => ({ ...prev, [key]: true }));
      try {
        const data = await geographyService.listStates(numericId, { isActive: true });
        let statesList = Array.isArray(data) && data.length > 0 ? data : [];
        if (statesList.length === 0 && (numericId === 1 || String(countryId).toLowerCase() === 'india' || String(countryId) === '1')) {
          statesList = DEFAULT_INDIAN_STATES;
        }
        setStatesCache((prev) => ({
          ...prev,
          [key]: statesList,
          [String(countryId)]: statesList,
        }));
        return statesList;
      } catch (err) {
        console.warn(`CountryStateProvider: Failed to load states for country ${countryId}`, err);
        const fallback = (numericId === 1 || String(countryId).toLowerCase() === 'india' || String(countryId) === '1')
          ? DEFAULT_INDIAN_STATES
          : [];
        setStatesCache((prev) => ({
          ...prev,
          [key]: fallback,
          [String(countryId)]: fallback,
        }));
        return fallback;
      } finally {
        setLoadingStatesMap((prev) => ({ ...prev, [key]: false }));
      }
    },
    [statesCache, countries]
  );

  // Synchronous getter for dropdown options of a given country
  const getStateOptions = useCallback(
    (countryId) => {
      if (!countryId) return [];
      const list = statesCache[String(countryId)] || [];
      return list.map((s) => ({
        value: s.id,
        label: s.stateName,
      }));
    },
    [statesCache]
  );

  // Helper to resolve Country Name by ID or name
  const getCountryName = useCallback(
    (countryId) => {
      if (!countryId) return '—';
      const c = countries.find(
        (item) =>
          String(item.id) === String(countryId) ||
          item.countryName?.toLowerCase() === String(countryId).toLowerCase()
      );
      return c ? c.countryName : String(countryId);
    },
    [countries]
  );

  // Helper to resolve State Name by ID within a country (or across all cached states)
  const getStateName = useCallback(
    (countryId, stateId) => {
      if (!stateId) return '—';

      // 1. Search in specific country's cached states
      if (countryId && statesCache[String(countryId)]) {
        const found = statesCache[String(countryId)].find(
          (s) =>
            String(s.id) === String(stateId) ||
            s.stateName?.toLowerCase() === String(stateId).toLowerCase()
        );
        if (found) return found.stateName;
      }

      // 2. Search across all cached states in any country
      for (const key of Object.keys(statesCache)) {
        const found = statesCache[key].find(
          (s) =>
            String(s.id) === String(stateId) ||
            s.stateName?.toLowerCase() === String(stateId).toLowerCase()
        );
        if (found) return found.stateName;
      }

      return String(stateId);
    },
    [statesCache]
  );

  const value = useMemo(
    () => ({
      countries,
      countryOptions,
      isLoadingCountries,
      statesCache,
      loadingStatesMap,
      fetchStatesForCountry,
      getStateOptions,
      getCountryName,
      getStateName,
      ensureCountriesLoaded,
      reloadCountries: loadCountries,
    }),
    [
      countries,
      countryOptions,
      isLoadingCountries,
      statesCache,
      loadingStatesMap,
      fetchStatesForCountry,
      getStateOptions,
      getCountryName,
      getStateName,
      ensureCountriesLoaded,
      loadCountries,
    ]
  );

  return <CountryStateContext.Provider value={value}>{children}</CountryStateContext.Provider>;
}

export function useCountryState() {
  const context = useContext(CountryStateContext);
  if (!context) {
    throw new Error('useCountryState must be used within a CountryStateProvider');
  }
  return context;
}

export default CountryStateContext;
