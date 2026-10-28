import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { processFlowService } from '../services';
import { getFlowConfigForPath } from '../config/flowRouteConfig';

const ProcessFlowContext = createContext(null);

export function ProcessFlowProvider({ children }) {
  const location = useLocation();
  const [flows, setFlows] = useState([]);
  const [flowDetailsMap, setFlowDetailsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [stepOverride, setStepOverride] = useState(null);

  // Clear step override whenever navigation occurs
  useEffect(() => {
    setStepOverride(null);
  }, [location.pathname]);

  // Load summary of all flows once
  const loadFlowSummaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await processFlowService.listFlows();
      setFlows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('ProcessFlowProvider: Failed to load flows list', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlowSummaries();
  }, [loadFlowSummaries]);

  // Fetch and cache detailed steps for a specific module
  const loadFlowDetails = useCallback(
    async (moduleCode) => {
      if (!moduleCode) return null;
      const upper = moduleCode.toUpperCase();
      if (flowDetailsMap[upper]) {
        return flowDetailsMap[upper];
      }

      // Find matching summary to get ID
      const summary = flows.find(
        (f) => f.moduleCode?.toUpperCase() === upper && f.isActive !== false
      );
      if (!summary) return null;

      try {
        const detail = await processFlowService.getFlow(summary.id);
        if (detail) {
          setFlowDetailsMap((prev) => ({
            ...prev,
            [upper]: detail,
          }));
          return detail;
        }
      } catch (err) {
        console.warn(`ProcessFlowProvider: Failed to load details for ${moduleCode}`, err);
      }
      return null;
    },
    [flows, flowDetailsMap]
  );

  // Current route configuration
  const currentRouteConfig = useMemo(() => {
    return getFlowConfigForPath(location.pathname);
  }, [location.pathname]);

  // Auto-load details if current route has a moduleCode
  useEffect(() => {
    if (currentRouteConfig?.moduleCode && flows.length > 0) {
      loadFlowDetails(currentRouteConfig.moduleCode);
    }
  }, [currentRouteConfig, flows, loadFlowDetails]);

  const value = useMemo(
    () => ({
      flows,
      flowDetailsMap,
      isLoading,
      currentRouteConfig,
      stepOverride,
      setStepOverride,
      loadFlowDetails,
      refreshFlows: loadFlowSummaries,
    }),
    [
      flows,
      flowDetailsMap,
      isLoading,
      currentRouteConfig,
      stepOverride,
      loadFlowDetails,
      loadFlowSummaries,
    ]
  );

  return (
    <ProcessFlowContext.Provider value={value}>
      {children}
    </ProcessFlowContext.Provider>
  );
}

export function useProcessFlowContext() {
  return useContext(ProcessFlowContext);
}
