/**
 * categoryTree.js — Hierarchy tree builders, traversal utilities & path resolvers for Product Categories.
 */

/**
 * Returns full ancestor path name string (e.g. "Surface Plates › Granite Surface Plates")
 */
export function getCategoryPathName(categoryId, categories = []) {
  if (!categoryId) return '—';
  const catMap = new Map(categories.map((c) => [c.categoryId || c.id || c.value, c]));
  const pathParts = [];
  const visited = new Set();

  let currentId = categoryId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = catMap.get(currentId);
    if (!cat) break;
    pathParts.unshift(cat.categoryName || cat.name || cat.label || currentId);
    currentId = cat.parentCategoryId;
  }

  return pathParts.length > 0 ? pathParts.join(' › ') : categoryId;
}

/**
 * Returns parent category name or '—'
 */
export function getParentCategoryName(parentCategoryId, categories = []) {
  if (!parentCategoryId) return '—';
  const parent = categories.find((c) => (c.categoryId || c.id) === parentCategoryId);
  return parent ? (parent.categoryName || parent.name) : '—';
}

/**
 * Returns all descendant category IDs (children, grandchildren, etc.) for a given category
 */
export function getDescendantIds(categoryId, categories = []) {
  const descendantIds = new Set();
  if (!categoryId) return descendantIds;

  const childrenMap = new Map();
  categories.forEach((cat) => {
    const parentId = cat.parentCategoryId;
    if (parentId) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId).push(cat.categoryId);
    }
  });

  function traverse(id) {
    const children = childrenMap.get(id) || [];
    children.forEach((childId) => {
      if (!descendantIds.has(childId)) {
        descendantIds.add(childId);
        traverse(childId);
      }
    });
  }

  traverse(categoryId);
  return descendantIds;
}

/**
 * Builds nested tree nodes from flat category list
 */
export function buildCategoryTree(categories = []) {
  const nodeMap = new Map();
  const roots = [];

  // Initialize node objects
  categories.forEach((cat) => {
    nodeMap.set(cat.categoryId, {
      ...cat,
      children: [],
      depth: 0,
      pathName: getCategoryPathName(cat.categoryId, categories),
      parentName: getParentCategoryName(cat.parentCategoryId, categories),
    });
  });

  // Link children to parents
  categories.forEach((cat) => {
    const node = nodeMap.get(cat.categoryId);
    if (cat.parentCategoryId && nodeMap.has(cat.parentCategoryId)) {
      const parentNode = nodeMap.get(cat.parentCategoryId);
      node.depth = (parentNode.depth || 0) + 1;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Re-calculate depths recursively in case of arbitrary ordering
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

/**
 * Flattens tree into an array of visible rows based on expanded node IDs
 */
export function flattenVisible(treeRoots = [], expandedIds = new Set()) {
  const flattened = [];

  function traverse(nodes) {
    nodes.forEach((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.categoryId);

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
export function getCategoryDropdownOptions(
  categories = [],
  { activeOnly = true, currentSelectedId = null, excludeIds = [] } = {}
) {
  const excludeSet = new Set(excludeIds);

  const filtered = categories.filter((cat) => {
    if (excludeSet.has(cat.categoryId)) return false;
    if (!activeOnly) return true;
    if (currentSelectedId && cat.categoryId === currentSelectedId) return true;
    return cat.isActive;
  });

  // Sort by hierarchical path name
  return filtered
    .map((cat) => ({
      value: cat.categoryId,
      label: getCategoryPathName(cat.categoryId, categories),
      categoryCode: cat.categoryCode,
      isActive: cat.isActive,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
