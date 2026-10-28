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
import { geographyService } from '../services';

const CountryStateContext = createContext(null);

export function CountryStateProvider({ children }) {
  const [countries, setCountries] = useState([]);
  const [statesCache, setStatesCache] = useState({}); // { [countryId]: Array<State> }
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [loadingStatesMap, setLoadingStatesMap] = useState({}); // { [countryId]: boolean }

  // Load countries once on mount
  const loadCountries = useCallback(async () => {
    setIsLoadingCountries(true);
    try {
      const data = await geographyService.listCountries({ isActive: true });
      setCountries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('CountryStateProvider: Failed to load countries from API', err);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

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
      const key = String(countryId);

      // Return immediately if already cached
      if (statesCache[key]) {
        return statesCache[key];
      }

      setLoadingStatesMap((prev) => ({ ...prev, [key]: true }));
      try {
        const data = await geographyService.listStates(countryId, { isActive: true });
        const statesList = Array.isArray(data) ? data : [];
        setStatesCache((prev) => ({
          ...prev,
          [key]: statesList,
        }));
        return statesList;
      } catch (err) {
        console.warn(`CountryStateProvider: Failed to load states for country ${countryId}`, err);
        return [];
      } finally {
        setLoadingStatesMap((prev) => ({ ...prev, [key]: false }));
      }
    },
    [statesCache]
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
