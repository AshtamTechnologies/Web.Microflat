import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { GitFork, RotateCcw, AlertCircle, ChevronRight } from 'lucide-react';
import { useProcessFlowContext } from '../../context/ProcessFlowContext';
import { getFlowConfigForPath } from '../../config/flowRouteConfig';
import { getFlowIcon } from '../../constants/processFlowIcons';
import { IconCheck } from '../../constants/icons';

/**
 * ProcessFlowStepper — Global contextual horizontal stepper for workflow steps.
 *
 * Implements Option 1:
 *   - Primary Path: Renders the linear mainline milestone sequence (Row 1 / happy path).
 *   - Alternate Branches: Embedded cleanly inside the decision step's badge
 *     (e.g., inside Evaluation: "Step 3 • Alt: Rejected"), so the primary connector
 *     arrows connect directly from Evaluation ➔ Approved without false intermediate steps.
 *   - Portal Popover: Rendered via createPortal to document.body with fixed positioning
 *     so it is 100% visible and NEVER clipped by overflow containers or card boundaries.
 *
 * Modes:
 *   - 'overview' (default): Displays primary process steps sequentially as an informative guide.
 *   - 'tracker': Enables progress tracking (Completed, In Progress, Alternate Branch Active).
 */
export default function ProcessFlowStepper({
  mode = 'overview', // 'overview' | 'tracker'
  overrideStep,
  overrideModule,
  className = '',
}) {
  const location = useLocation();
  const context = useProcessFlowContext();
  const [activeBranchStepId, setActiveBranchStepId] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);

  // Close popover when clicking anywhere outside
  useEffect(() => {
    function handleDocumentClick() {
      setActiveBranchStepId(null);
      setPopoverPos(null);
    }
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Close popover on window resize / scroll to avoid misaligned fixed coordinates
  useEffect(() => {
    function handleScrollOrResize() {
      if (activeBranchStepId) {
        setActiveBranchStepId(null);
        setPopoverPos(null);
      }
    }
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [activeBranchStepId]);

  const currentRouteConfig = useMemo(() => {
    return context?.currentRouteConfig || getFlowConfigForPath(location.pathname);
  }, [context?.currentRouteConfig, location.pathname]);

  const targetModule = (overrideModule || currentRouteConfig?.moduleCode || '').toUpperCase();

  const flow = useMemo(() => {
    if (!targetModule || !context?.flowDetailsMap) return null;
    return context.flowDetailsMap[targetModule] || null;
  }, [targetModule, context?.flowDetailsMap]);

  // Extract all active steps and transitions
  const allSteps = useMemo(() => {
    if (!flow || !Array.isArray(flow.steps)) return [];
    return flow.steps.filter((s) => s.isActive !== false);
  }, [flow]);

  const allTransitions = useMemo(() => {
    if (!flow || !Array.isArray(flow.transitions)) return [];
    return flow.transitions.filter((t) => t.isActive !== false);
  }, [flow]);

  // Separate Primary mainline steps from Alternate branch steps
  const { primarySteps, branchMap, totalBranchCount } = useMemo(() => {
    if (!allSteps.length) {
      return { primarySteps: [], branchMap: {}, totalBranchCount: 0 };
    }

    // Determine primary row (minimum row number among active steps, usually 1)
    const minRow = Math.min(...allSteps.map((s) => Number(s.rowNo) || 1));

    // Primary steps sorted by colNo
    const primary = allSteps
      .filter((s) => (Number(s.rowNo) || 1) === minRow)
      .sort((a, b) => (Number(a.colNo) || 1) - (Number(b.colNo) || 1));

    const primaryIds = new Set(primary.map((s) => s.id));
    const stepById = new Map(allSteps.map((s) => [s.id, s]));

    // Map outgoing transitions
    const outgoing = new Map();
    allTransitions.forEach((t) => {
      if (!outgoing.has(t.fromStepId)) outgoing.set(t.fromStepId, []);
      outgoing.get(t.fromStepId).push(t);
    });

    // Detect branches originating from primary steps
    const branches = {};
    let branchCounter = 0;

    primary.forEach((pStep) => {
      const outs = outgoing.get(pStep.id) || [];
      const altTransitions = outs.filter((t) => {
        const targetStep = stepById.get(t.toStepId);
        if (!targetStep) return false;
        return !primaryIds.has(targetStep.id) || t.outcomeType === 'Rejected';
      });

      if (altTransitions.length > 0) {
        branchCounter += altTransitions.length;
        branches[pStep.id] = altTransitions.map((t) => {
          const chain = [];
          let currId = t.toStepId;
          const visited = new Set();
          let loopbackStep = null;

          while (currId && !visited.has(currId)) {
            visited.add(currId);
            const st = stepById.get(currId);
            if (!st) break;

            if (primaryIds.has(st.id)) {
              loopbackStep = st;
              break;
            }

            chain.push(st);

            const nextTrans = outgoing.get(currId) || [];
            if (nextTrans.length > 0) {
              currId = nextTrans[0].toStepId;
            } else {
              break;
            }
          }

          return {
            id: t.id,
            label: t.label || chain.map((c) => c.title).join(' ➔ ') || 'Alternative',
            outcomeType: t.outcomeType || 'Rejected',
            steps: chain,
            loopbackStep,
          };
        });
      }
    });

    return {
      primarySteps: primary,
      branchMap: branches,
      totalBranchCount: branchCounter,
    };
  }, [allSteps, allTransitions]);

  // Determine active step index for tracker mode
  const { activeStepIndex, activeBranchStep } = useMemo(() => {
    if (!primarySteps.length || mode !== 'tracker') {
      return { activeStepIndex: -1, activeBranchStep: null };
    }

    const target = String(
      overrideStep ||
      context?.stepOverride ||
      currentRouteConfig?.defaultStep ||
      ''
    ).trim().toLowerCase();

    if (!target) {
      return {
        activeStepIndex: currentRouteConfig?.pageType === 'view' ? primarySteps.length - 1 : 0,
        activeBranchStep: null,
      };
    }

    // 1. Check if target matches any primary step
    const primaryIdx = primarySteps.findIndex(
      (s) =>
        s.title?.toLowerCase() === target ||
        s.title?.toLowerCase().includes(target) ||
        target.includes(s.title?.toLowerCase())
    );

    if (primaryIdx !== -1) {
      return { activeStepIndex: primaryIdx, activeBranchStep: null };
    }

    // 2. Check if target matches any branch step (e.g. 'Rejected' or 'Resubmit')
    for (const pStep of primarySteps) {
      const branches = branchMap[pStep.id] || [];
      for (const branch of branches) {
        const foundInBranch = branch.steps.find(
          (s) =>
            s.title?.toLowerCase() === target ||
            s.title?.toLowerCase().includes(target) ||
            target.includes(s.title?.toLowerCase())
        );
        if (foundInBranch) {
          const pIdx = primarySteps.findIndex((s) => s.id === pStep.id);
          return {
            activeStepIndex: pIdx,
            activeBranchStep: foundInBranch,
          };
        }
      }
    }

    return {
      activeStepIndex: currentRouteConfig?.pageType === 'view' ? primarySteps.length - 1 : 0,
      activeBranchStep: null,
    };
  }, [primarySteps, branchMap, mode, overrideStep, context?.stepOverride, currentRouteConfig]);

  // Toggle branch popover positioned cleanly relative to trigger
  const handleToggleBranch = (e, stepId) => {
    e.stopPropagation();
    if (activeBranchStepId === stepId) {
      setActiveBranchStepId(null);
      setPopoverPos(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 288;
    let left = rect.left;

    // Viewport bounds protection
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    let top = rect.bottom + 6;
    if (top + 190 > window.innerHeight) {
      top = Math.max(16, rect.top - 190);
    }

    setPopoverPos({ top, left });
    setActiveBranchStepId(stepId);
  };

  const activeStepObj = useMemo(() => {
    if (!activeBranchStepId) return null;
    return primarySteps.find((s) => s.id === activeBranchStepId) || null;
  }, [activeBranchStepId, primarySteps]);

  const activeBranches = useMemo(() => {
    if (!activeBranchStepId) return [];
    return branchMap[activeBranchStepId] || [];
  }, [activeBranchStepId, branchMap]);

  // Non-workflow page
  if (!currentRouteConfig) {
    return null;
  }

  // If page requested blank space or flow is still not configured for this module
  if (!flow || !primarySteps.length) {
    if (currentRouteConfig.showBlank) {
      return <div className="h-2 w-full" aria-hidden="true" />;
    }
    return null;
  }

  const isTrackerMode = mode === 'tracker' && activeStepIndex >= 0;

  return (
    <div
      className={`w-full bg-surface/60 border border-border/80 rounded-xl p-3 sm:px-4 sm:py-3.5 shadow-2xs transition-all duration-200 ${className}`}
      aria-label="Workflow process flow"
    >
      {/* ── Stepper Header: Flow Name, Module Code & Step Overview ── */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/50 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="font-semibold text-heading truncate text-xs">
            {flow.name || `${targetModule} Process Flow`}
          </span>
          <span className="hidden sm:inline font-mono text-2xs px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
            {targetModule}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-2xs font-medium">
          {isTrackerMode ? (
            <>
              <span className="text-text-muted">
                Step <strong className="text-heading font-mono">{activeStepIndex + 1}</strong> of{' '}
                <span className="font-mono">{primarySteps.length}</span>
              </span>
              <span className="text-border">•</span>
              <span className="text-primary font-semibold">
                {activeBranchStep
                  ? `Branch: ${activeBranchStep.title}`
                  : primarySteps[activeStepIndex]?.title || 'In Progress'}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-text-muted">
              <span>
                <strong className="text-heading font-mono">{primarySteps.length}</strong> Primary Steps
              </span>
              {totalBranchCount > 0 && (
                <>
                  <span className="text-border">•</span>
                  <span className="text-danger/90 font-medium inline-flex items-center gap-1">
                    <GitFork size={11} className="rotate-90 shrink-0" />
                    {totalBranchCount} Alternate Branch{totalBranchCount > 1 ? 'es' : ''}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Primary Stepper Track (Horizontal Single-Row Layout) ── */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none select-none">
        {primarySteps.map((step, idx) => {
          const StepIcon = getFlowIcon(step.iconKey);
          const branches = branchMap[step.id] || [];
          const hasBranch = branches.length > 0;
          const isBranchOpen = activeBranchStepId === step.id;

          // Tracker mode evaluations
          const isCompleted = isTrackerMode && idx < activeStepIndex;
          const isCurrent = isTrackerMode && idx === activeStepIndex;
          const hasActiveBranchHere = isCurrent && Boolean(activeBranchStep);

          return (
            <React.Fragment key={step.id || idx}>
              {/* Connector line directly between primary milestone steps */}
              {idx > 0 && (
                <div
                  className={`h-0.5 min-w-3 sm:min-w-6 flex-1 rounded-full transition-colors ${
                    isTrackerMode
                      ? idx <= activeStepIndex
                        ? 'bg-success/70'
                        : 'bg-border/80'
                      : 'bg-border/70'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Primary Step Pill */}
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                  isTrackerMode
                    ? isCurrent
                      ? hasActiveBranchHere
                        ? 'bg-danger/10 border-danger text-danger font-semibold shadow-2xs ring-1 ring-danger/20'
                        : 'bg-primary/10 border-primary text-primary font-semibold shadow-2xs ring-1 ring-primary/20'
                      : isCompleted
                      ? 'bg-success/5 border-success/30 text-success hover:bg-success/10'
                      : 'bg-bg border-border text-text-muted hover:border-border/90'
                    : 'bg-bg border-border/80 text-text hover:border-primary/40 hover:bg-surface/50 shadow-2xs'
                }`}
                title={step.description || step.title}
              >
                {/* Step Icon Badge */}
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs transition-colors ${
                    isTrackerMode
                      ? isCurrent
                        ? hasActiveBranchHere
                          ? 'bg-danger text-white shadow-2xs'
                          : 'bg-primary text-white shadow-2xs'
                        : isCompleted
                        ? 'bg-success/20 text-success'
                        : 'bg-surface text-text-muted border border-border/60'
                      : 'bg-surface text-primary border border-border/60'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? <IconCheck size={12} /> : <StepIcon size={12} />}
                </span>

                {/* Title & Sequence */}
                <div className="flex flex-col text-left min-w-0 pr-0.5">
                  <span
                    className={`text-xs whitespace-nowrap truncate leading-tight ${
                      isTrackerMode
                        ? isCurrent
                          ? 'font-bold text-heading'
                          : isCompleted
                          ? 'font-medium text-text'
                          : 'font-normal text-text-muted'
                        : 'font-semibold text-heading'
                    }`}
                  >
                    {step.title}
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-text-muted/70 font-mono leading-none">
                      Step {idx + 1}
                    </span>

                    {/* ── Alternate Branch Chip embedded INSIDE the step pill ── */}
                    {hasBranch && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleBranch(e, step.id)}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          hasActiveBranchHere
                            ? 'bg-danger/25 border-danger text-danger ring-1 ring-danger/30'
                            : isBranchOpen
                            ? 'bg-danger text-white border-danger shadow-xs'
                            : 'bg-danger/10 border-danger/30 text-danger hover:bg-danger/20 hover:border-danger/50'
                        }`}
                        title="Click to view alternate outcome"
                        aria-label="View alternate outcome"
                        aria-expanded={isBranchOpen}
                      >
                        <GitFork size={9} className="rotate-90 shrink-0" />
                        <span>Alt: {branches[0]?.label || 'Rejected'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Portal Popover for Alternate Branch Details (100% Unclipped) ── */}
      {activeBranchStepId && popoverPos && activeStepObj && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            zIndex: 99999,
          }}
          className="w-72 p-3 bg-surface border border-border rounded-xl shadow-xl text-left animate-in fade-in zoom-in-95 duration-150 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/50 text-2xs font-semibold text-heading">
            <span className="inline-flex items-center gap-1.5 text-danger font-bold">
              <AlertCircle size={12} />
              Alternate Outcome Path
            </span>
            <span className="text-text-muted font-normal text-[11px]">
              from {activeStepObj.title}
            </span>
          </div>

          {activeBranches.map((b, bIdx) => (
            <div key={b.id || bIdx} className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap text-2xs">
                {b.steps.map((bStep, sIdx) => {
                  const BIcon = getFlowIcon(bStep.iconKey);
                  const isDanger = bStep.outcomeType === 'Rejected';
                  const isWarning = bStep.outcomeType === 'Warning';
                  return (
                    <React.Fragment key={bStep.id || sIdx}>
                      {sIdx > 0 && <ChevronRight size={10} className="text-text-muted shrink-0" />}
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-medium ${
                          isDanger
                            ? 'bg-danger/10 border-danger/30 text-danger'
                            : isWarning
                            ? 'bg-warning/10 border-warning/30 text-warning'
                            : 'bg-surface border-border text-text'
                        }`}
                      >
                        <BIcon size={10} />
                        {bStep.title}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>

              {b.loopbackStep && (
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted bg-bg/80 px-2 py-1 rounded border border-border/60">
                  <RotateCcw size={11} className="text-primary shrink-0" />
                  <span>
                    Loops back to:{' '}
                    <strong className="text-heading font-medium">{b.loopbackStep.title}</strong>
                  </span>
                </div>
              )}
            </div>
          ))}

          <div className="mt-2.5 pt-1.5 border-t border-border/40 text-[10px] text-text-muted flex items-center justify-between">
            <span>Mutually exclusive with approval</span>
            <button
              type="button"
              onClick={() => {
                setActiveBranchStepId(null);
                setPopoverPos(null);
              }}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
