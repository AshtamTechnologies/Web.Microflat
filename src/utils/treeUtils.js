/**
 * treeUtils.js — Generalized hierarchy tree builders, traversal utilities & path resolvers.
 *
 * Supports arbitrary data models by accepting key name parameters:
 *   - idKey: property name for entity unique ID (e.g., 'categoryId', 'regionId', 'id')
 *   - parentKey: property name for parent ID (e.g., 'parentCategoryId', 'parentRegionId', 'parentId')
 *   - nameKey: property name for display name (e.g., 'categoryName', 'regionName', 'name')
 *   - codeKey: property name for code string (e.g., 'categoryCode', 'regionCode', 'code')
 */

/**
 * Returns full ancestor path name string (e.g. "Domestic › West Region")
 */
export function getPathLabel(
  itemId,
  items = [],
  {
    idKey = 'id',
    parentKey = 'parentId',
    nameKey = 'name',
  } = {}
) {
  if (!itemId) return '—';

  const itemMap = new Map(
    items.map((item) => [
      item[idKey] || item.categoryId || item.regionId || item.id || item.value,
      item,
    ])
  );

  const pathParts = [];
  const visited = new Set();

  let currentId = itemId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = itemMap.get(currentId);
    if (!item) break;

    const label =
      item[nameKey] ||
      item.categoryName ||
      item.regionName ||
      item.name ||
      item.label ||
      currentId;

    pathParts.unshift(label);
    currentId = item[parentKey] !== undefined ? item[parentKey] : (item.parentCategoryId || item.parentRegionId || item.parentId);
  }

  return pathParts.length > 0 ? pathParts.join(' › ') : itemId;
}

// Alias for Category compatibility
export const getCategoryPathName = (categoryId, categories = []) =>
  getPathLabel(categoryId, categories, {
    idKey: 'categoryId',
    parentKey: 'parentCategoryId',
    nameKey: 'categoryName',
  });

/**
 * Returns parent item name or '—'
 */
export function getParentName(
  parentId,
  items = [],
  {
    idKey = 'id',
    nameKey = 'name',
  } = {}
) {
  if (!parentId) return '—';
  const parent = items.find(
    (item) =>
      (item[idKey] || item.categoryId || item.regionId || item.id) === parentId
  );
  if (!parent) return '—';
  return (
    parent[nameKey] ||
    parent.categoryName ||
    parent.regionName ||
    parent.name ||
    '—'
  );
}

// Alias for Category compatibility
export const getParentCategoryName = (parentId, categories = []) =>
  getParentName(parentId, categories, {
    idKey: 'categoryId',
    nameKey: 'categoryName',
  });

/**
 * Returns all descendant IDs (children, grandchildren, etc.) for a given item ID
 */
export function getDescendantIds(
  itemId,
  items = [],
  {
    idKey = 'id',
    parentKey = 'parentId',
  } = {}
) {
  const descendantIds = new Set();
  if (!itemId) return descendantIds;

  const childrenMap = new Map();
  items.forEach((item) => {
    const pId = item[parentKey] !== undefined ? item[parentKey] : (item.parentCategoryId || item.parentRegionId || item.parentId);
    const cId = item[idKey] !== undefined ? item[idKey] : (item.categoryId || item.regionId || item.id);
    if (pId && cId) {
      if (!childrenMap.has(pId)) childrenMap.set(pId, []);
      childrenMap.get(pId).push(cId);
    }
  });

  function traverse(currId) {
    const children = childrenMap.get(currId) || [];
    children.forEach((childId) => {
      if (!descendantIds.has(childId)) {
        descendantIds.add(childId);
        traverse(childId);
      }
    });
  }

  traverse(itemId);
  return descendantIds;
}

/**
 * Builds nested tree nodes from flat list
 */
export function buildTree(
  items = [],
  {
    idKey = 'id',
    parentKey = 'parentId',
    nameKey = 'name',
    codeKey = 'code',
  } = {}
) {
  const nodeMap = new Map();
  const roots = [];

  // Initialize node objects
  items.forEach((item) => {
    const itemId = item[idKey] !== undefined ? item[idKey] : (item.categoryId || item.regionId || item.id);
    const parentId = item[parentKey] !== undefined ? item[parentKey] : (item.parentCategoryId || item.parentRegionId || item.parentId);

    nodeMap.set(itemId, {
      ...item,
      children: [],
      depth: 0,
      pathName: getPathLabel(itemId, items, { idKey, parentKey, nameKey }),
      parentName: getParentName(parentId, items, { idKey, nameKey }),
    });
  });

  // Link children to parents
  items.forEach((item) => {
    const itemId = item[idKey] !== undefined ? item[idKey] : (item.categoryId || item.regionId || item.id);
    const parentId = item[parentKey] !== undefined ? item[parentKey] : (item.parentCategoryId || item.parentRegionId || item.parentId);
    const node = nodeMap.get(itemId);

    if (parentId && nodeMap.has(parentId)) {
      const parentNode = nodeMap.get(parentId);
      node.depth = (parentNode.depth || 0) + 1;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Re-calculate depths recursively in case of arbitrary input ordering
  function updateDepths(nodes, currentDepth = 0) {
    nodes.forEach((node) => {
      node.depth = currentDepth;
      if (node.children && node.children.length > 0) {
        updateDepths(node.children, currentDepth + 1);
      }
    });
  }

  updateDepths(roots, 0);
  return roots;
}

// Alias for Category compatibility
export const buildCategoryTree = (categories = []) =>
  buildTree(categories, {
    idKey: 'categoryId',
    parentKey: 'parentCategoryId',
    nameKey: 'categoryName',
    codeKey: 'categoryCode',
  });

/**
 * Flattens tree into an array of visible rows based on expanded node IDs
 */
export function flattenVisible(
  treeRoots = [],
  expandedIds = new Set(),
  {
    idKey = 'id',
  } = {}
) {
  const flattened = [];

  function traverse(nodes) {
    nodes.forEach((node) => {
      const itemId = node[idKey] !== undefined ? node[idKey] : (node.categoryId || node.regionId || node.id);
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(itemId);

      flattened.push({
        ...node,
        hasChildren,
        isExpanded,
      });

      if (hasChildren && isExpanded) {
        traverse(node.children);
      }
    });
  }

  traverse(treeRoots);
  return flattened;
}

/**
 * Builds clean dropdown select options with hierarchy paths
 */
export function getDropdownOptions(
  items = [],
  {
    idKey = 'id',
    parentKey = 'parentId',
    nameKey = 'name',
    codeKey = 'code',
    activeOnly = true,
    currentSelectedId = null,
    excludeIds = [],
  } = {}
) {
  const excludeSet = new Set(excludeIds);

  const filtered = items.filter((item) => {
    const itemId = item[idKey] !== undefined ? item[idKey] : (item.categoryId || item.regionId || item.id);
    if (excludeSet.has(itemId)) return false;
    if (!activeOnly) return true;
    if (currentSelectedId && itemId === currentSelectedId) return true;
    return Boolean(item.isActive);
  });

  // Sort by hierarchical path label
  return filtered
    .map((item) => {
      const itemId = item[idKey] !== undefined ? item[idKey] : (item.categoryId || item.regionId || item.id);
      const itemCode = item[codeKey] || item.categoryCode || item.regionCode || item.code;
      return {
        value: itemId,
        label: getPathLabel(itemId, items, { idKey, parentKey, nameKey }),
        code: itemCode,
        isActive: Boolean(item.isActive),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Alias for Category compatibility
export const getCategoryDropdownOptions = (categories = [], options = {}) =>
  getDropdownOptions(categories, {
    idKey: 'categoryId',
    parentKey: 'parentCategoryId',
    nameKey: 'categoryName',
    codeKey: 'categoryCode',
    ...options,
  });
