import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_REGIONS } from '../mocks/regions';
import { getPathLabel, getDropdownOptions } from '../utils/treeUtils';

const RegionsContext = createContext(null);

export function RegionsProvider({ children }) {
  const [regions, setRegions] = useState(INITIAL_REGIONS);

  const getRegionById = useCallback(
    (id) => {
      return regions.find((r) => r.regionId === id || r.id === id) || null;
    },
    [regions]
  );

  const getRegionName = useCallback(
    (regionId) => {
      if (!regionId) return '—';
      const label = getPathLabel(regionId, regions, {
        idKey: 'regionId',
        parentKey: 'parentRegionId',
        nameKey: 'regionName',
      });
      return label || regionId;
    },
    [regions]
  );

  const getRegionOptions = useCallback(
    ({ activeOnly = true, currentSelectedId = null, excludeIds = [] } = {}) => {
      return getDropdownOptions(regions, {
        idKey: 'regionId',
        parentKey: 'parentRegionId',
        nameKey: 'regionName',
        codeKey: 'regionCode',
        activeOnly,
        currentSelectedId,
        excludeIds,
      });
    },
    [regions]
  );

  const addRegion = useCallback(async (data) => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 500));

    const newId = `reg_${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const newRegion = {
      regionId: newId,
      regionCode: data.regionCode.trim().toUpperCase(),
      regionName: data.regionName.trim(),
      parentRegionId: data.parentRegionId ? data.parentRegionId : null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdOn: today,
    };

    setRegions((prev) => [...prev, newRegion]);
    toast.success('Region added');
    return newRegion;
  }, []);

  const updateRegion = useCallback(async (id, data) => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 500));

    setRegions((prev) =>
      prev.map((r) => {
        if (r.regionId === id || r.id === id) {
          return {
            ...r,
            regionCode: data.regionCode ? data.regionCode.trim().toUpperCase() : r.regionCode,
            regionName: data.regionName ? data.regionName.trim() : r.regionName,
            parentRegionId:
              data.parentRegionId !== undefined
                ? (data.parentRegionId || null)
                : r.parentRegionId,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : r.isActive,
          };
        }
        return r;
      })
    );
    toast.success('Region updated');
    return { ok: true };
  }, []);

  const deleteRegion = useCallback((id) => {
    setRegions((prev) => prev.filter((r) => r.regionId !== id && r.id !== id));
    toast.success('Region deleted');
  }, []);

  const toggleRegionActive = useCallback((id) => {
    setRegions((prev) =>
      prev.map((r) => {
        if (r.regionId === id || r.id === id) {
          const nextState = !r.isActive;
          toast.success(nextState ? 'Region activated' : 'Region deactivated');
          return {
            ...r,
            isActive: nextState,
          };
        }
        return r;
      })
    );
  }, []);

  return (
    <RegionsContext.Provider
      value={{
        regions,
        getRegionById,
        getRegionName,
        getRegionOptions,
        addRegion,
        updateRegion,
        deleteRegion,
        toggleRegionActive,
      }}
    >
      {children}
    </RegionsContext.Provider>
  );
}

export function useRegionsContext() {
  const context = useContext(RegionsContext);
  if (!context) {
    throw new Error('useRegionsContext must be used within a RegionsProvider');
  }
  return context;
}

export const useRegions = useRegionsContext;
export default RegionsContext;
