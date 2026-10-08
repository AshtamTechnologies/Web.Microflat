import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_PRODUCT_CATEGORIES } from '../mocks/productCategories';

const ProductCategoriesContext = createContext(null);

export function ProductCategoriesProvider({ children }) {
  const [categories, setCategories] = useState(INITIAL_PRODUCT_CATEGORIES);

  const getCategoryById = useCallback(
    (id) => {
      return categories.find((c) => c.categoryId === id || c.id === id) || null;
    },
    [categories]
  );

  const addCategory = useCallback(async (data) => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 500));

    const newId = `cat_${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const newCat = {
      categoryId: newId,
      categoryCode: data.categoryCode.trim().toUpperCase(),
      categoryName: data.categoryName.trim(),
      parentCategoryId: data.parentCategoryId ? data.parentCategoryId : null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdOn: today,
    };

    setCategories((prev) => [...prev, newCat]);
    toast.success('Category added');
    return newCat;
  }, []);

  const updateCategory = useCallback(async (id, data) => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 500));

    setCategories((prev) =>
      prev.map((c) => {
        if (c.categoryId === id || c.id === id) {
          return {
            ...c,
            categoryCode: data.categoryCode ? data.categoryCode.trim().toUpperCase() : c.categoryCode,
            categoryName: data.categoryName ? data.categoryName.trim() : c.categoryName,
            parentCategoryId:
              data.parentCategoryId !== undefined
                ? (data.parentCategoryId || null)
                : c.parentCategoryId,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : c.isActive,
          };
        }
        return c;
      })
    );
    toast.success('Category updated');
    return { ok: true };
  }, []);

  const deleteCategory = useCallback((id) => {
    setCategories((prev) => prev.filter((c) => c.categoryId !== id && c.id !== id));
    toast.success('Category deleted');
  }, []);

  const toggleCategoryActive = useCallback((id) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.categoryId === id || c.id === id) {
          const nextState = !c.isActive;
          toast.success(nextState ? 'Category activated' : 'Category deactivated');
          return {
            ...c,
            isActive: nextState,
          };
        }
        return c;
      })
    );
  }, []);

  return (
    <ProductCategoriesContext.Provider
      value={{
        categories,
        getCategoryById,
        addCategory,
        updateCategory,
        deleteCategory,
        toggleCategoryActive,
      }}
    >
      {children}
    </ProductCategoriesContext.Provider>
  );
}

export function useProductCategoriesContext() {
  const context = useContext(ProductCategoriesContext);
  if (!context) {
    throw new Error('useProductCategoriesContext must be used within a ProductCategoriesProvider');
  }
  return context;
}

export const useProductCategories = useProductCategoriesContext;
export default ProductCategoriesContext;
