/**
 * flowLayout.js — Pure geometric layout engine for Process Flow Diagram.
 *
 * Responsibilities:
 *   - Compresses sparse grid coordinates into consecutive display lanes.
 *   - Distributes multi-port anchors on nodes so overlapping transitions do not share identical coordinates.
 *   - Routes backward loopback transitions around nodes and into the left input port horizontally.
 *   - Solves label collisions with multi-pass bounding box separation.
 *   - Computes deterministic (x, y) coordinates for nodes and SVG paths.
 */

export const DEFAULT_LAYOUT_CONFIG = {
  nodeWidth: 184,
  nodeHeight: 74,
  gapX: 148,
  gapY: 76,
  paddingX: 68,
  paddingY: 60,
};

/**
 * Computes diagram canvas dimensions, positioned nodes, and routed arrow paths.
 *
 * @param {import('../models/processFlow/processFlowModel').ProcessFlowStepModel[]} [steps]
 * @param {import('../models/processFlow/processFlowModel').ProcessFlowTransitionModel[]} [transitions]
 * @param {object} [options]
 * @param {boolean} [options.showInactive=false]
 * @param {number} [options.nodeWidth]
 * @param {number} [options.nodeHeight]
 * @param {number} [options.gapX]
 * @param {number} [options.gapY]
 * @returns {{
 *   canvasWidth: number,
 *   canvasHeight: number,
 *   nodes: Array<object>,
 *   transitions: Array<object>
 * }}
 */
export function computeFlowLayout(steps = [], transitions = [], options = {}) {
  const config = { ...DEFAULT_LAYOUT_CONFIG, ...options };
  const showInactive = Boolean(options.showInactive);

  // 1. Filter visible steps
  const visibleSteps = steps.filter((s) => showInactive || s.isActive);
  if (visibleSteps.length === 0) {
    return {
      canvasWidth: 600,
      canvasHeight: 320,
      nodes: [],
      transitions: [],
    };
  }

  // 2. Resolve cell collisions so steps sharing the same (colNo, rowNo) don't overlap
  const colStepMap = new Map();
  visibleSteps.forEach((s) => {
    const c = Number(s.colNo) || 1;
    if (!colStepMap.has(c)) colStepMap.set(c, []);
    colStepMap.get(c).push(s);
  });

  const stepVisualCoord = new Map();
  colStepMap.forEach((colSteps, col) => {
    colSteps.sort((a, b) => {
      const rA = Number(a.rowNo) || 1;
      const rB = Number(b.rowNo) || 1;
      if (rA !== rB) return rA - rB;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.id - b.id;
    });

    let occupiedRow = -999;
    colSteps.forEach((step) => {
      let r = Number(step.rowNo) || 1;
      if (r <= occupiedRow) {
        r = occupiedRow + 1;
      }
      occupiedRow = r;
      stepVisualCoord.set(step.id, { visualCol: col, visualRow: r });
    });
  });

  // Compress columns and rows into sorted display coordinates
  const uniqueCols = Array.from(
    new Set(Array.from(stepVisualCoord.values()).map((v) => v.visualCol))
  ).sort((a, b) => a - b);
  const uniqueRows = Array.from(
    new Set(Array.from(stepVisualCoord.values()).map((v) => v.visualRow))
  ).sort((a, b) => a - b);

  const colMap = new Map(uniqueCols.map((col, idx) => [col, idx]));
  const rowMap = new Map(uniqueRows.map((row, idx) => [row, idx]));

  const W = config.nodeWidth;
  const H = config.nodeHeight;
  const GX = config.gapX;
  const GY = config.gapY;
  const PX = config.paddingX;
  const PY = config.paddingY;

  // Compute adaptive column X positions based on transition label lengths between adjacent columns
  const colX = new Map();
  let currX = PX;
  uniqueCols.forEach((colVal, c) => {
    colX.set(c, currX);
    if (c < uniqueCols.length - 1) {
      let maxLabelLen = 0;
      transitions.forEach((t) => {
        if (!t.label) return;
        const fromStep = visibleSteps.find((s) => s.id === t.fromStepId);
        const toStep = visibleSteps.find((s) => s.id === t.toStepId);
        if (!fromStep || !toStep) return;
        const fromCoord = stepVisualCoord.get(fromStep.id);
        const toCoord = stepVisualCoord.get(toStep.id);
        const fc = colMap.get(fromCoord?.visualCol ?? (Number(fromStep.colNo) || 1));
        const tc = colMap.get(toCoord?.visualCol ?? (Number(toStep.colNo) || 1));
        if (fc === c && tc === c + 1) {
          maxLabelLen = Math.max(maxLabelLen, t.label.trim().length);
        }
      });
      // Because labels wrap at ~18-20 characters per line, the chip width is ~135-150px max.
      // Keep adaptive gap tightly bounded between 136px and 176px so the diagram remains cohesive and compact.
      const wrappedLineChars = Math.min(20, maxLabelLen);
      const neededChipW = maxLabelLen > 0 ? wrappedLineChars * 6.5 + 20 : 0;
      const adaptiveGap = Math.min(176, Math.max(136, neededChipW + 26));
      currX += W + adaptiveGap;
    }
  });

  // 3. Position each visible step
  const nodeMap = new Map();
  const positionedNodes = visibleSteps.map((step) => {
    const coord = stepVisualCoord.get(step.id);
    const displayCol = colMap.get(coord?.visualCol ?? (Number(step.colNo) || 1)) ?? 0;
    const displayRow = rowMap.get(coord?.visualRow ?? (Number(step.rowNo) || 1)) ?? 0;

    const x = colX.get(displayCol) ?? (PX + displayCol * (W + GX));
    const y = PY + displayRow * (H + GY);

    const node = {
      ...step,
      x,
      y,
      width: W,
      height: H,
      displayCol,
      displayRow,
      anchors: {
        left: [x, y + H / 2],
        right: [x + W, y + H / 2],
        top: [x + W / 2, y],
        bottom: [x + W / 2, y + H],
        center: [x + W / 2, y + H / 2],
      },
    };

    nodeMap.set(step.id, node);
    return node;
  });

  // 4. Filter visible transitions
  const visibleTransitions = transitions.filter((t) => {
    const hasFrom = nodeMap.has(t.fromStepId);
    const hasTo = nodeMap.has(t.toStepId);
    if (!hasFrom || !hasTo) return false;
    return showInactive || t.isActive;
  });

  // Group transitions for multi-port distribution
  const outgoingRightMap = new Map();
  const incomingLeftMap = new Map();
  const backwardTransitions = [];

  visibleTransitions.forEach((t) => {
    const fromNode = nodeMap.get(t.fromStepId);
    const toNode = nodeMap.get(t.toStepId);
    const colDiff = toNode.displayCol - fromNode.displayCol;

    if (colDiff < 0) {
      backwardTransitions.push(t);
    } else if (colDiff > 0) {
      if (!outgoingRightMap.has(fromNode.id)) outgoingRightMap.set(fromNode.id, []);
      outgoingRightMap.get(fromNode.id).push(t);
    }

    // Register all incoming transitions entering toNode on the left (both forward & loopback)
    if (colDiff !== 0) {
      if (!incomingLeftMap.has(toNode.id)) incomingLeftMap.set(toNode.id, []);
      incomingLeftMap.get(toNode.id).push(t);
    }
  });

  // Sort outgoing transitions by target row so lines don't cross at the exit port
  outgoingRightMap.forEach((list) => {
    list.sort((a, b) => {
      const rowA = nodeMap.get(a.toStepId).displayRow;
      const rowB = nodeMap.get(b.toStepId).displayRow;
      return rowA - rowB;
    });
  });

  // Sort incoming transitions: loopbacks enter higher or lower depending on their source
  incomingLeftMap.forEach((list) => {
    list.sort((a, b) => {
      const fromA = nodeMap.get(a.fromStepId);
      const fromB = nodeMap.get(b.fromStepId);
      return fromA.displayRow - fromB.displayRow;
    });
  });

  // Track max bottom coordinate of all nodes for the bottom gutter
  const maxNodeBottomY = Math.max(...positionedNodes.map((n) => n.y + n.height));

  // Map backward transition ID to an allocated loop index for multi-lane spacing
  const backwardIndexMap = new Map();
  backwardTransitions.forEach((t, idx) => {
    backwardIndexMap.set(t.id, idx);
  });

  // 5. Compute SVG Path and Label Coordinates for each transition
  const positionedTransitions = visibleTransitions.map((trans) => {
    const fromNode = nodeMap.get(trans.fromStepId);
    const toNode = nodeMap.get(trans.toStepId);

    const sameRow = fromNode.displayRow === toNode.displayRow;
    const colDiff = toNode.displayCol - fromNode.displayCol;

    let pathD;
    let labelX;
    let labelY;

    // A. Backward Transitions (Loopbacks / Feedback flows)
    // Routes around nodes into toNode's left input port horizontally
    if (colDiff < 0) {
      const loopIndex = backwardIndexMap.get(trans.id) || 0;

      // Calculate distributed entry port on left edge of toNode
      const inList = incomingLeftMap.get(toNode.id) || [trans];
      const inIdx = inList.findIndex((t) => t.id === trans.id);
      let entryY = toNode.y + H / 2;
      if (inList.length === 2) {
        entryY = inIdx === 0 ? toNode.y + H * 0.35 : toNode.y + H * 0.65;
      } else if (inList.length > 2) {
        const stepY = (H - 24) / (inList.length - 1);
        entryY = toNode.y + 12 + inIdx * stepY;
      }

      const leftX = toNode.x - 28 - loopIndex * 18;
      const toX = toNode.x;
      const toY = entryY;
      const r = 14; // corner radius

      // If both are in top row (displayRow === 0), route via top clearance corridor
      if (fromNode.displayRow === 0 && toNode.displayRow === 0) {
        const x1 = fromNode.x + fromNode.width * 0.5;
        const y1 = fromNode.y;
        const topY = Math.max(16, PY - 28 - loopIndex * 24);

        pathD = [
          `M ${x1} ${y1}`,
          `L ${x1} ${topY + r}`,
          `Q ${x1} ${topY} ${x1 - r} ${topY}`,
          `L ${leftX + r} ${topY}`,
          `Q ${leftX} ${topY} ${leftX} ${topY + r}`,
          `L ${leftX} ${toY - r}`,
          `Q ${leftX} ${toY} ${leftX + r} ${toY}`,
          `L ${toX} ${toY}`,
        ].join(' ');

        labelX = (x1 + toNode.x) / 2;
        labelY = topY - 10;
      } else {
        // Route via dedicated bottom gutter below all nodes
        const x1 = fromNode.x + fromNode.width * 0.5;
        const y1 = fromNode.y + fromNode.height;
        const gutterY = maxNodeBottomY + 34 + loopIndex * 28;

        pathD = [
          `M ${x1} ${y1}`,
          `L ${x1} ${gutterY - r}`,
          `Q ${x1} ${gutterY} ${x1 - r} ${gutterY}`,
          `L ${leftX + r} ${gutterY}`,
          `Q ${leftX} ${gutterY} ${leftX} ${gutterY - r}`,
          `L ${leftX} ${toY + r}`,
          `Q ${leftX} ${toY} ${leftX + r} ${toY}`,
          `L ${toX} ${toY}`,
        ].join(' ');

        labelX = (x1 + toNode.x) / 2;
        labelY = gutterY + 12;
      }
    }
    // B. Self-loops (same step)
    else if (fromNode.id === toNode.id) {
      const x = fromNode.x;
      const y = fromNode.y;
      pathD = `M ${x + W * 0.3} ${y} C ${x + W * 0.3} ${y - 32}, ${x + W * 0.7} ${y - 32}, ${x + W * 0.7} ${y}`;
      labelX = x + W * 0.5;
      labelY = y - 38;
    }
    // C. Same Column Vertical Transitions (colDiff === 0)
    else if (colDiff === 0) {
      const isGoingDown = toNode.displayRow > fromNode.displayRow;
      const x = fromNode.x + fromNode.width * 0.5;
      const y1 = isGoingDown ? fromNode.y + fromNode.height : fromNode.y;
      const y2 = isGoingDown ? toNode.y : toNode.y + toNode.height;

      pathD = `M ${x} ${y1} L ${x} ${y2}`;
      labelX = x + 18;
      labelY = (y1 + y2) / 2;
    }
    // D. Forward Transitions (colDiff > 0)
    else {
      // Calculate distributed exit port on right edge of fromNode
      const outList = outgoingRightMap.get(fromNode.id) || [trans];
      const outIdx = outList.findIndex((t) => t.id === trans.id);
      let exitY = fromNode.y + H / 2;
      if (outList.length === 2) {
        exitY = outIdx === 0 ? fromNode.y + H * 0.35 : fromNode.y + H * 0.65;
      } else if (outList.length > 2) {
        const stepY = (H - 24) / (outList.length - 1);
        exitY = fromNode.y + 12 + outIdx * stepY;
      }

      // Calculate distributed entry port on left edge of toNode
      const inList = incomingLeftMap.get(toNode.id) || [trans];
      const inIdx = inList.findIndex((t) => t.id === trans.id);
      let entryY = toNode.y + H / 2;
      if (inList.length === 2) {
        entryY = inIdx === 0 ? toNode.y + H * 0.35 : toNode.y + H * 0.65;
      } else if (inList.length > 2) {
        const stepY = (H - 24) / (inList.length - 1);
        entryY = toNode.y + 12 + inIdx * stepY;
      }

      const x1 = fromNode.x + W;
      const y1 = exitY;
      const x2 = toNode.x;
      const y2 = entryY;

      if (sameRow && colDiff === 1) {
        // Adjacent forward in same row: Direct smooth line
        pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
        labelX = (x1 + x2) / 2;
        labelY = (y1 + y2) / 2 - 12;
      } else if (sameRow && colDiff > 1) {
        // Forward skipping intermediate columns: Arch above
        const archHeight = Math.min(y1, y2) - (26 + (colDiff - 1) * 10);
        pathD = `M ${x1} ${y1} C ${x1 + 20} ${archHeight}, ${x2 - 20} ${archHeight}, ${x2} ${y2}`;
        labelX = (x1 + x2) / 2;
        labelY = archHeight - 8;
      } else {
        // Cross-row forward: Smooth S-curve with distributed ports
        const dx = x2 - x1;
        const midX = (x1 + x2) / 2;
        pathD = `M ${x1} ${y1} C ${x1 + dx * 0.45} ${y1}, ${x2 - dx * 0.45} ${y2}, ${x2} ${y2}`;
        labelX = midX;
        labelY = (y1 + y2) / 2 - 10;
      }
    }

    return {
      ...trans,
      pathD,
      labelX,
      labelY,
      fromNode,
      toNode,
    };
  });

  // 6. Anti-Collision Pass for Transition Labels
  const labelled = positionedTransitions.filter((t) => Boolean(t.label?.trim()));
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < labelled.length; i++) {
      for (let j = i + 1; j < labelled.length; j++) {
        const a = labelled[i];
        const b = labelled[j];

        const dx = Math.abs(a.labelX - b.labelX);
        const dy = Math.abs(a.labelY - b.labelY);
        const maxLen = Math.max(a.label.length, b.label.length);
        const minW = maxLen * 7.2 + 24;
        const minH = 22;

        if (dx < minW && dy < minH) {
          const overlapY = minH - dy;
          const shift = overlapY / 2 + 5;
          if (a.labelY <= b.labelY) {
            a.labelY -= shift;
            b.labelY += shift;
          } else {
            a.labelY += shift;
            b.labelY -= shift;
          }
        }
      }
    }
  }

  // 7. Compute total canvas bounds with padding
  const maxNodeX = Math.max(...positionedNodes.map((n) => n.x + n.width), 0);
  const maxNodeY = Math.max(...positionedNodes.map((n) => n.y + n.height), 0);
  const maxTransitionY = Math.max(
    ...positionedTransitions.map((t) => (t.labelY ? t.labelY + 24 : 0)),
    0
  );

  const canvasWidth = Math.max(820, maxNodeX + PX + 40);
  const canvasHeight = Math.max(420, maxNodeY + PY + 30, maxTransitionY + PY);

  return {
    canvasWidth,
    canvasHeight,
    nodes: positionedNodes,
    transitions: positionedTransitions,
  };
}
