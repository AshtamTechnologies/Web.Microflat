import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_UOM_LIST } from '../mocks/uom';

const UomContext = createContext(null);
const STORAGE_KEY = 'microflat_uom_list_simple';

export function UomProvider({ children }) {
  const [uomList, setUomList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_UOM_LIST;
  });

  // Sync with local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uomList));
    } catch {
      // ignore
    }
  }, [uomList]);

  const getUomById = useCallback(
    (id) => {
      return uomList.find((u) => u.uomId === id || u.id === id) || null;
    },
    [uomList]
  );

  const addUom = useCallback(async (data) => {
    // Simulated mock network delay
    await new Promise((r) => setTimeout(r, 400));

    const newId = `uom_${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const newUom = {
      uomId: newId,
      id: newId,
      uomName: data.uomName.trim(),
      description: data.description ? data.description.trim() : '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdOn: today,
    };

    setUomList((prev) => [newUom, ...prev]);
    toast.success('UOM added successfully');
    return newUom;
  }, []);

  const updateUom = useCallback(async (id, data) => {
    // Simulated mock network delay
    await new Promise((r) => setTimeout(r, 400));

    setUomList((prev) =>
      prev.map((u) => {
        if (u.uomId === id || u.id === id) {
          return {
            ...u,
            uomName: data.uomName ? data.uomName.trim() : u.uomName,
            description:
              data.description !== undefined ? data.description.trim() : u.description,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : u.isActive,
          };
        }
        return u;
      })
    );

    toast.success('UOM updated successfully');
    return { ok: true };
  }, []);

  const deleteUom = useCallback((id) => {
    setUomList((prev) => prev.filter((u) => u.uomId !== id && u.id !== id));
    toast.success('UOM deleted');
  }, []);

  const toggleUomActive = useCallback((id) => {
    setUomList((prev) =>
      prev.map((u) => {
        if (u.uomId === id || u.id === id) {
          const nextActive = !u.isActive;
          toast.success(nextActive ? `${u.uomName} activated` : `${u.uomName} deactivated`);
          return {
            ...u,
            isActive: nextActive,
          };
        }
        return u;
      })
    );
  }, []);

  return (
    <UomContext.Provider
      value={{
        uomList,
        getUomById,
        addUom,
        updateUom,
        deleteUom,
        toggleUomActive,
      }}
    >
      {children}
    </UomContext.Provider>
  );
}

export function useUomContext() {
  const context = useContext(UomContext);
  if (!context) {
    throw new Error('useUomContext must be used within a UomProvider');
  }
  return context;
}

export const useUom = useUomContext;
export default UomContext;
