/**
 * FlowDiagram.jsx — SVG-rendered interactive Process Flow diagram.
 *
 * Props:
 *   - steps: ProcessFlowStepModel[]
 *   - transitions: ProcessFlowTransitionModel[]
 *   - showInactive: boolean
 *   - onToggleShowInactive: function(boolean)
 *   - selectedStepId: number|null
 *   - selectedTransitionId: number|null
 *   - onStepClick: function(step)
 *   - onTransitionClick: function(transition)
 *   - onAddStep?: function()
 */

import { useMemo, useState } from 'react';
import { computeFlowLayout } from '../../utils/flowLayout';
import { getFlowIcon } from '../../constants/processFlowIcons';
import { getOutcomeStyle } from '../../constants/processFlow';
import { Button, EmptyState } from '../ui';

/**
 * Wraps long transition labels into balanced lines of ~18-20 characters max.
 * Preserves words and ensures full visibility without cutting off text.
 */
function wrapLabel(text, maxCharsPerLine = 18) {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  if (words.length === 1 && words[0].length <= maxCharsPerLine) {
    return [words[0]];
  }

  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Handle exceptionally long single words without spaces
  const finalLines = [];
  for (const line of lines) {
    if (line.length <= maxCharsPerLine + 4) {
      finalLines.push(line);
    } else {
      for (let i = 0; i < line.length; i += maxCharsPerLine) {
        finalLines.push(line.slice(i, i + maxCharsPerLine));
      }
    }
  }

  return finalLines;
}

export default function FlowDiagram({
  steps = [],
  transitions = [],
  showInactive = false,
  onToggleShowInactive,
  selectedStepId = null,
  selectedTransitionId = null,
  onStepClick,
  onTransitionClick,
  onAddStep,
  onDeselect,
}) {
  const [hoveredTransitionId, setHoveredTransitionId] = useState(null);

  // Compute layout geometry purely based on steps and transitions
  const layout = useMemo(() => {
    return computeFlowLayout(steps, transitions, { showInactive });
  }, [steps, transitions, showInactive]);

  const isEmpty = layout.nodes.length === 0;

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget || e.target.tagName === 'svg') {
      onDeselect?.();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg overflow-hidden flex flex-col shadow-xs">
      {/* ── Toolbar: Legend ── */}
      <div className="p-3.5 bg-surface/80 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-heading uppercase tracking-wider text-2xs">
            Diagram Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-surface border border-border" />
            <span className="text-text-muted">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-text-muted">Success</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
            <span className="text-text-muted">Rejected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span className="text-text-muted">Warning</span>
          </div>
        </div>
      </div>

      {/* ── Canvas Container (Overflow scrollable on mobile/tablet) ── */}
      <div
        className="relative w-full overflow-auto min-h-[380px] bg-bg/60 p-4"
        onClick={handleCanvasClick}
      >
        {isEmpty ? (
          <div className="flex items-center justify-center py-16">
            <EmptyState
              title="No steps in flow"
              description="This process flow currently has no active steps to render."
              action={
                onAddStep && (
                  <Button variant="primary" size="sm" icon={IconAdd} onClick={onAddStep}>
                    Add First Step
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div
            className="relative select-none"
            onClick={handleCanvasClick}
            style={{
              width: `${layout.canvasWidth}px`,
              height: `${layout.canvasHeight}px`,
            }}
          >
            {/* ── SVG Arrow Overlay ── */}
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              onClick={handleCanvasClick}
              style={{ width: `${layout.canvasWidth}px`, height: `${layout.canvasHeight}px` }}
            >
              <defs>
                {/* Arrow markers */}
                <marker
                  id="arrow-normal"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" className="fill-border" />
                </marker>
                <marker
                  id="arrow-success"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" className="fill-success" />
                </marker>
                <marker
                  id="arrow-danger"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" className="fill-danger" />
                </marker>
                <marker
                  id="arrow-warning"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" className="fill-warning" />
                </marker>
                <marker
                  id="arrow-selected"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" className="fill-primary" />
                </marker>
                <marker
                  id="arrow-inactive"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" className="fill-text-muted/50" />
                </marker>
              </defs>

              {/* Draw each transition line */}
              {layout.transitions.map((trans) => {
                const isSelected = selectedTransitionId === trans.id;
                const isHovered = hoveredTransitionId === trans.id;
                const lowerOutcome = String(trans.outcomeType || '').toLowerCase();
                const isDanger = lowerOutcome === 'danger' || lowerOutcome === 'rejected';
                const isWarning = lowerOutcome === 'warning';
                const isSuccess = lowerOutcome === 'success';
                const isInactive = !trans.isActive;

                const strokeColor = isSelected || isHovered
                  ? 'var(--primary)'
                  : isInactive
                  ? 'var(--text-muted)'
                  : isDanger
                  ? 'var(--danger)'
                  : isWarning
                  ? 'var(--warning)'
                  : isSuccess
                  ? 'var(--success)'
                  : 'var(--border)';

                const markerId = isSelected || isHovered
                  ? 'arrow-selected'
                  : isInactive
                  ? 'arrow-inactive'
                  : isDanger
                  ? 'arrow-danger'
                  : isWarning
                  ? 'arrow-warning'
                  : isSuccess
                  ? 'arrow-success'
                  : 'arrow-normal';

                const rawLabel = String(trans.label || '').trim();
                const lines = wrapLabel(rawLabel, 18);
                const maxLineChars = Math.max(...lines.map((l) => l.length), 0);
                const chipWidth = Math.max(52, maxLineChars * 6.5 + 20);
                const chipHeight = Math.max(22, lines.length * 13 + 8);
                const chipX = -chipWidth / 2;
                const chipY = -chipHeight / 2;

                return (
                  <g key={`trans_${trans.id}`} className="transition-all">
                    {/* Wide transparent hit path for easy clicking */}
                    <path
                      d={trans.pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="16"
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransitionClick?.(trans);
                      }}
                      onMouseEnter={() => setHoveredTransitionId(trans.id)}
                      onMouseLeave={() => setHoveredTransitionId(null)}
                    />

                    {/* Visible line */}
                    <path
                      d={trans.pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected || isHovered ? '2.5' : '1.75'}
                      strokeDasharray={isInactive ? '4 3' : undefined}
                      markerEnd={`url(#${markerId})`}
                      className="transition-colors duration-150"
                    />

                    {/* Optional Label Chip at midpoint (wrapped multi-line badge) */}
                    {rawLabel && (
                      <g
                        transform={`translate(${trans.labelX}, ${trans.labelY})`}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTransitionClick?.(trans);
                        }}
                        onMouseEnter={() => setHoveredTransitionId(trans.id)}
                        onMouseLeave={() => setHoveredTransitionId(null)}
                      >
                        <title>{rawLabel}</title>
                        <rect
                          x={chipX}
                          y={chipY}
                          width={chipWidth}
                          height={chipHeight}
                          rx="6"
                          className={`fill-bg stroke ${
                            isSelected || isHovered
                              ? 'stroke-primary text-primary'
                              : isInactive
                              ? 'stroke-border/70 text-text-muted opacity-80'
                              : isDanger
                              ? 'stroke-danger/70 text-danger'
                              : isWarning
                              ? 'stroke-warning/70 text-warning'
                              : isSuccess
                              ? 'stroke-success/70 text-success'
                              : 'stroke-border text-text-muted'
                          } transition-colors shadow-2xs`}
                        />
                        <text
                          textAnchor="middle"
                          className={`text-3xs font-medium font-sans ${
                            isSelected || isHovered
                              ? 'fill-primary'
                              : isInactive
                              ? 'fill-text-muted/80'
                              : isDanger
                              ? 'fill-danger'
                              : isWarning
                              ? 'fill-warning'
                              : isSuccess
                              ? 'fill-success'
                              : 'fill-text-muted'
                          }`}
                        >
                          {lines.map((lineText, idx) => {
                            const startY = -((lines.length - 1) * 13) / 2 + 3.5;
                            const lineY = startY + idx * 13;
                            return (
                              <tspan key={idx} x="0" y={lineY}>
                                {lineText}
                              </tspan>
                            );
                          })}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ── Interactive HTML Node Cards ── */}
            {layout.nodes.map((node) => {
              const isSelected = selectedStepId === node.id;
              const lowerOutcome = String(node.outcomeType || '').toLowerCase();
              const isDanger = lowerOutcome === 'danger' || lowerOutcome === 'rejected';
              const isWarning = lowerOutcome === 'warning';
              const isSuccess = lowerOutcome === 'success';
              const isInactive = !node.isActive;
              const outcomeStyle = getOutcomeStyle(node.outcomeType);
              const NodeIcon = getFlowIcon(node.iconKey);

              return (
                <button
                  key={`node_${node.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepClick?.(node);
                  }}
                  aria-label={`${node.title}${isInactive ? ' (Inactive)' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                  className={[
                    'p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer group',
                    'focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs',
                    isSelected
                      ? 'ring-2 ring-primary border-primary bg-primary/[0.04]'
                      : isInactive
                      ? 'border-dashed border-border/80 bg-surface/30 opacity-60'
                      : isDanger
                      ? 'border-danger/50 bg-danger/[0.03] hover:border-danger'
                      : isWarning
                      ? 'border-warning/50 bg-warning/[0.03] hover:border-warning'
                      : isSuccess
                      ? 'border-success/50 bg-success/[0.03] hover:border-success'
                      : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-hover/50',
                  ].join(' ')}
                >
                  {/* Top Row: Icon + Title */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isDanger
                          ? 'bg-danger/10 text-danger'
                          : isWarning
                          ? 'bg-warning/10 text-warning'
                          : isSuccess
                          ? 'bg-success/10 text-success'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <NodeIcon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-bold text-heading truncate group-hover:text-primary transition-colors"
                        title={node.title}
                      >
                        {node.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bottom Row: Description (clamped to 2 lines) & Inactive Badge */}
                  <div className="flex items-center justify-between gap-1.5 mt-1">
                    <p
                      className="text-2xs text-text-muted line-clamp-1 truncate flex-1"
                      title={node.description || 'No description'}
                    >
                      {node.description || '—'}
                    </p>
                    {isInactive && (
                      <span className="text-3xs px-1.5 py-0.5 rounded bg-border/50 text-text-muted shrink-0 font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
