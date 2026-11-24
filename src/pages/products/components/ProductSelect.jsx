/**
 * ProductSelect.jsx — Reusable paginated & searchable product dropdown.
 *
 * Features:
 * - Paginated fetching (PageSize <= 100) adhering strictly to backend API limits.
 * - Live search with 300ms debounce across productCode and productName.
 * - "Load More" button and infinite scroll trigger when reaching the list bottom.
 * - Shows loaded count vs total count (e.g. "Showing 50 of 248 products").
 * - Viewport-aware Portal rendering (never clipped by modals, cards, or tables).
 * - Full keyboard navigation (Arrows, Enter, Escape).
 * - Optional "All Products" option for filter toolbars.
 * - Preserves pre-selected product label even before pages load.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { productService } from '../../../services';

const DEFAULT_PAGE_SIZE = 50;

export default function ProductSelect({
  id = 'product-select',
  name = 'productId',
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Select a product...',
  searchPlaceholder = 'Search code or name...',
  emptyText = 'No products found',
  error,
  hint,
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  showAllOption = false,
  allOptionLabel = 'All Products',
  categoryId,
  isActive,
  selectedProduct: initialSelectedProduct = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Fallback cache for selected product if not yet in paginated list
  const [cachedSelectedProduct, setCachedSelectedProduct] = useState(initialSelectedProduct);

  // DOM Refs
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Coordinates for fixed-position Portal
  const [coords, setCoords] = useState(null);

  // Debounce search query changes (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch page 1 when open state, debouncedSearch, categoryId, or isActive changes
  const fetchFirstPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        pageNumber: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (categoryId && categoryId !== 'ALL' && !isNaN(Number(categoryId))) {
        params.categoryId = Number(categoryId);
      }
      if (isActive !== undefined && isActive !== null && isActive !== 'ALL') {
        params.isActive = isActive;
      }

      const res = await productService.listProducts(params);
      const items = res?.items || [];
      setProducts(items);
      setTotalCount(res?.totalCount || 0);
      setPageNumber(1);
      setHighlightedIndex(0);
    } catch (err) {
      console.warn('ProductSelect: Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, categoryId, isActive]);

  // Fetch when dropdown is opened or search/filter parameters change
  useEffect(() => {
    if (isOpen) {
      fetchFirstPage();
    }
  }, [isOpen, fetchFirstPage]);

  // Load next page
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    if (products.length >= totalCount) return;

    setIsLoadingMore(true);
    try {
      const nextPage = pageNumber + 1;
      const params = {
        pageNumber: nextPage,
        pageSize: DEFAULT_PAGE_SIZE,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (categoryId && categoryId !== 'ALL' && !isNaN(Number(categoryId))) {
        params.categoryId = Number(categoryId);
      }
      if (isActive !== undefined && isActive !== null && isActive !== 'ALL') {
        params.isActive = isActive;
      }

      const res = await productService.listProducts(params);
      const newItems = res?.items || [];

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = newItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });
      setPageNumber(nextPage);
      if (res?.totalCount !== undefined) {
        setTotalCount(res.totalCount);
      }
    } catch (err) {
      console.warn('ProductSelect: Failed to load next page:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading, products.length, totalCount, pageNumber, debouncedSearch, categoryId, isActive]);

  // If a specific value is passed, ensure its label is resolved
  useEffect(() => {
    let isMounted = true;
    if (value && value !== 'ALL') {
      const found = products.find((p) => String(p.id) === String(value));
      if (found) {
        setCachedSelectedProduct(found);
      } else if (!cachedSelectedProduct || String(cachedSelectedProduct.id) !== String(value)) {
        // Fetch single product by ID to display label accurately
        productService
          .getProductById(value)
          .then((p) => {
            if (isMounted && p) setCachedSelectedProduct(p);
          })
          .catch(() => {});
      }
    } else if (value === 'ALL' || !value) {
      setCachedSelectedProduct(null);
    }
    return () => {
      isMounted = false;
    };
  }, [value, products, cachedSelectedProduct]);

  // Measure trigger and position dropdown portal
  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = Math.min(Math.max(rect.width, 280), viewportWidth - 24);
      const left = Math.max(12, Math.min(rect.left, viewportWidth - dropdownWidth - 12));
      setCoords({
        top: rect.bottom + 6,
        left,
        width: dropdownWidth,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) updateCoords();
  }, [isOpen, updateCoords]);

  // Open/Close listeners
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const handleScrollResize = () => updateCoords();
      window.addEventListener('resize', handleScrollResize);
      window.addEventListener('scroll', handleScrollResize, true);

      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleScrollResize);
        window.removeEventListener('scroll', handleScrollResize, true);
      };
    } else {
      setCoords(null);
    }
  }, [isOpen, updateCoords]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      const clickedTrigger = triggerRef.current?.contains(e.target);
      const clickedDropdown = dropdownRef.current?.contains(e.target);

      if (!clickedTrigger && !clickedDropdown) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.({ target: { name, value } });
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur, name, value]);

  // Infinite scroll trigger on list scroll
  const handleListScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 30) {
      if (products.length < totalCount && !isLoadingMore && !isLoading) {
        handleLoadMore();
      }
    }
  };

  // Option list generation
  const renderedOptions = useMemo(() => {
    const list = [];
    if (showAllOption) {
      list.push({
        value: 'ALL',
        label: allOptionLabel,
        isAllOption: true,
      });
    }

    products.forEach((p) => {
      list.push({
        value: String(p.id),
        label: `${p.productCode} — ${p.productName}`,
        raw: p,
      });
    });

    return list;
  }, [showAllOption, allOptionLabel, products]);

  // Selected Option Label Display
  const displayLabel = useMemo(() => {
    if (value === 'ALL' && showAllOption) return allOptionLabel;
    if (!value) return '';

    const match = products.find((p) => String(p.id) === String(value));
    if (match) return `${match.productCode} — ${match.productName}`;

    if (cachedSelectedProduct && String(cachedSelectedProduct.id) === String(value)) {
      return `${cachedSelectedProduct.productCode} — ${cachedSelectedProduct.productName}`;
    }

    return String(value);
  }, [value, showAllOption, allOptionLabel, products, cachedSelectedProduct]);

  // Handle Selection
  const handleSelect = (selectedVal, productRaw = null) => {
    setIsOpen(false);
    if (productRaw) setCachedSelectedProduct(productRaw);

    if (onChange) {
      // Support both event-like `{ target: { name, value } }` and direct value
      const synthEvent = {
        target: { name, value: selectedVal },
        value: selectedVal,
        product: productRaw,
      };
      onChange(synthEvent, productRaw);
    }
  };

  // Keyboard navigation
  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      updateCoords();
      setIsOpen(true);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < renderedOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : renderedOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < renderedOptions.length) {
        const item = renderedOptions[highlightedIndex];
        handleSelect(item.value, item.raw);
      }
    }
  };

  const hasMore = products.length < totalCount;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5 relative">
      {/* Label */}
      {label && (
        <label htmlFor={id} className="mf-label">
          {label}
          {required && <span className="mf-required" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            updateCoords();
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'w-full rounded-control border bg-bg text-left',
          size === 'sm'
            ? 'h-[var(--control-height-sm)] text-xs'
            : size === 'lg'
            ? 'h-[var(--control-height-lg)] text-base'
            : 'h-[var(--control-height-md)] text-sm',
          'px-3 flex items-center justify-between',
          'transition-all duration-150 ease-in-out cursor-pointer',
          'outline-none select-none',
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
            : hasError
            ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
            : 'border-border hover:border-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={
            displayLabel
              ? 'text-heading font-medium truncate'
              : 'text-text-muted/50 font-normal truncate'
          }
        >
          {displayLabel || placeholder}
        </span>

        <span className="flex items-center gap-1.5 text-text-muted shrink-0 ml-2">
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={[
              'transition-transform duration-200 ease-in-out',
              isOpen ? 'rotate-180 text-primary' : '',
            ].join(' ')}
          />
        </span>
      </button>

      {/* Portal Dropdown Menu */}
      {isOpen &&
        coords &&
        coords.width > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-bg border border-border rounded-modal shadow-dropdown overflow-hidden animate-in fade-in duration-100 flex flex-col max-h-[360px]"
          >
            {/* Search Box */}
            <div className="p-2 border-b border-border bg-surface/60 flex items-center gap-2 shrink-0">
              {isLoading ? (
                <Loader2 size={14} className="text-primary animate-spin shrink-0 ml-1" />
              ) : (
                <Search size={14} className="text-text-muted shrink-0 ml-1" aria-hidden="true" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-heading placeholder:text-text-muted/50 outline-none py-0.5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded text-text-muted hover:text-text cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Options List */}
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              onScroll={handleListScroll}
              className="overflow-y-auto p-1 space-y-0.5 flex-1 min-h-[120px] max-h-[220px]"
            >
              {isLoading && products.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin text-primary" />
                  <span>Loading products...</span>
                </li>
              ) : renderedOptions.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-text-muted">
                  {emptyText}
                </li>
              ) : (
                renderedOptions.map((option, index) => {
                  const isSelected = String(option.value) === String(value);
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={option.value || `opt-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value, option.raw)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={[
                        'px-3 py-2 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : isHighlighted
                          ? 'bg-surface text-heading'
                          : 'text-text hover:bg-surface/70',
                      ].join(' ')}
                    >
                      <span className="truncate" title={option.label}>
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check
                          size={12}
                          strokeWidth={3}
                          className="text-primary shrink-0 ml-2"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Pagination / Load More Footer */}
            {renderedOptions.length > 0 && (
              <div className="p-2 border-t border-border bg-surface/50 shrink-0 text-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full py-1.5 px-3 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-primary" />
                        <span>Loading more products...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} />
                        <span>
                          Load more ({products.length} of {totalCount})
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-text-muted">
                    Showing all {products.length} product{products.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}
          </div>,
          document.body
        )}

      {/* Field Error */}
      {hasError && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger flex items-center gap-1">
          {error}
        </p>
      )}

      {/* Hint */}
      {!hasError && hint && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
