import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { processFlowService } from '../../../../services';

/**
 * useProcessFlowEditor — Hook managing the single Process Flow Editor page state.
 *
 * Enforces server synchronization: refetches the complete flow detail after EVERY mutation
 * to ensure cascading changes (like transition deactivation on step deletion) are accurately reflected.
 *
 * @param {string|number} flowId
 */
export default function useProcessFlowEditor(flowId) {
  const [flow, setFlow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab & display settings
  const [activeTab, setActiveTab] = useState('diagram'); // 'diagram' | 'steps' | 'transitions'
  const [showInactive, setShowInactive] = useState(true);

  // Selection state (interactive diagram)
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState(null);

  // Modals state
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [editingTransition, setEditingTransition] = useState(null);

  const fetchFlow = useCallback(async () => {
    if (!flowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await processFlowService.getFlow(flowId);
      setFlow(data);
    } catch (err) {
      setError(err);
      toast.error(err?.message || 'Failed to load process flow');
    } finally {
      setIsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  // Derived summaries
  const steps = useMemo(() => flow?.steps || [], [flow]);
  const transitions = useMemo(() => flow?.transitions || [], [flow]);

  const activeSteps = useMemo(() => steps.filter((s) => s.isActive), [steps]);
  const activeTransitions = useMemo(() => transitions.filter((t) => t.isActive), [transitions]);

  const activeStepsCount = useMemo(
    () => activeSteps.length,
    [activeSteps]
  );
  const activeTransitionsCount = useMemo(
    () => activeTransitions.length,
    [activeTransitions]
  );
  const inactiveCount = useMemo(
    () =>
      steps.filter((s) => !s.isActive).length +
      transitions.filter((t) => !t.isActive).length,
    [steps, transitions]
  );

  // Visible items based on showInactive toggle
  const visibleSteps = useMemo(() => {
    return showInactive ? steps : steps.filter((s) => s.isActive);
  }, [steps, showInactive]);

  const visibleTransitions = useMemo(() => {
    return showInactive ? transitions : transitions.filter((t) => t.isActive);
  }, [transitions, showInactive]);

  // Step operations
  const openCreateStepModal = () => {
    setEditingStep(null);
    setIsStepModalOpen(true);
  };

  const openEditStepModal = (step) => {
    setEditingStep(step);
    setIsStepModalOpen(true);
  };

  const closeStepModal = () => {
    setEditingStep(null);
    setIsStepModalOpen(false);
    setSelectedStepId(null);
  };

  const handleRemoveStep = async (step) => {
    try {
      await processFlowService.removeStep(step.id);
      toast.success(`Step "${step.title}" removed`);
      await fetchFlow();
    } catch (err) {
      toast.error(err?.message || 'Failed to remove step');
    }
  };

  const handleRestoreStep = async (step) => {
    try {
      await processFlowService.restoreStep(step.id, step);
      toast.success(`Step "${step.title}" restored`);
      await fetchFlow();
    } catch (err) {
      toast.error(err?.message || 'Failed to restore step (cell may be occupied)');
    }
  };

  // Transition operations
  const openCreateTransitionModal = () => {
    setEditingTransition(null);
    setIsTransitionModalOpen(true);
  };

  const openEditTransitionModal = (transition) => {
    setEditingTransition(transition);
    setIsTransitionModalOpen(true);
  };

  const closeTransitionModal = () => {
    setEditingTransition(null);
    setIsTransitionModalOpen(false);
    setSelectedTransitionId(null);
  };

  const handleRemoveTransition = async (transition) => {
    try {
      await processFlowService.removeTransition(transition.id);
      toast.success('Transition removed');
      await fetchFlow();
    } catch (err) {
      toast.error(err?.message || 'Failed to remove transition');
    }
  };

  const handleRestoreTransition = async (transition) => {
    try {
      await processFlowService.restoreTransition(transition.id, transition);
      toast.success('Transition restored');
      await fetchFlow();
    } catch (err) {
      toast.error(err?.message || 'Failed to restore transition');
    }
  };

  // Diagram click handlers
  const handleStepClick = (step) => {
    setSelectedStepId(step.id);
    setSelectedTransitionId(null);
    openEditStepModal(step);
  };

  const handleTransitionClick = (transition) => {
    setSelectedTransitionId(transition.id);
    setSelectedStepId(null);
    openEditTransitionModal(transition);
  };

  const handleDeselect = () => {
    setSelectedStepId(null);
    setSelectedTransitionId(null);
  };

  return {
    flow,
    isLoading,
    error,
    refetch: fetchFlow,

    // Collections
    steps,
    transitions,
    activeSteps,
    activeTransitions,
    visibleSteps,
    visibleTransitions,

    // Metrics
    activeStepsCount,
    activeTransitionsCount,
    inactiveCount,

    // Controls
    activeTab,
    setActiveTab,
    showInactive,
    setShowInactive,
    selectedStepId,
    selectedTransitionId,

    // Modals
    isFlowModalOpen,
    setIsFlowModalOpen,
    isStepModalOpen,
    editingStep,
    openCreateStepModal,
    openEditStepModal,
    closeStepModal,
    handleRemoveStep,
    handleRestoreStep,

    isTransitionModalOpen,
    editingTransition,
    openCreateTransitionModal,
    openEditTransitionModal,
    closeTransitionModal,
    handleRemoveTransition,
    handleRestoreTransition,

    // Diagram events
    handleStepClick,
    handleTransitionClick,
    handleDeselect,
  };
}
