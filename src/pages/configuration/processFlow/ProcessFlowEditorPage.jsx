import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Badge,
  StatusBadge,
  ScrollableTabs,
  StatusSwitch,
  EmptyState,
} from '../../../components/ui';
import {
  IconArrowLeft,
  IconAdd,
  IconEdit,
  IconWorkflow,
  IconProcessFlow,
  IconList,
  IconArrowRight,
  IconError,
} from '../../../constants/icons';
import useProcessFlowEditor from './hooks/useProcessFlowEditor';
import FlowDiagram from '../../../components/FlowDiagram/FlowDiagram';
import StepsTable from './components/StepsTable';
import TransitionsTable from './components/TransitionsTable';
import StepFormModal from './components/StepFormModal';
import TransitionFormModal from './components/TransitionFormModal';
import FlowFormModal from './components/FlowFormModal';

/**
 * ProcessFlowEditorPage — Designer and manager for an individual Process Flow.
 */
export default function ProcessFlowEditorPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();

  const {
    flow,
    isLoading,
    error,
    refetch,
    steps,
    transitions,
    activeSteps,
    activeTransitions,
    activeStepsCount,
    activeTransitionsCount,
    inactiveCount,
    activeTab,
    setActiveTab,
    showInactive,
    setShowInactive,
    selectedStepId,
    selectedTransitionId,
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
    handleStepClick,
    handleTransitionClick,
    handleDeselect,
  } = useProcessFlowEditor(flowId);

  // Tab definitions
  const tabs = [
    {
      id: 'diagram',
      label: 'Diagram',
      icon: IconWorkflow,
      count: activeSteps.length,
    },
    {
      id: 'steps',
      label: 'Steps',
      icon: IconList,
      count: steps.length,
    },
    {
      id: 'transitions',
      label: 'Transitions',
      icon: IconArrowRight,
      count: transitions.length,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12 w-full animate-pulse">
        <div className="h-10 bg-surface rounded w-1/3" />
        <div className="h-24 bg-surface rounded-xl" />
        <div className="h-96 bg-surface rounded-xl" />
      </div>
    );
  }

  // 404 / Missing flow state
  if (!flow || error) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center">
        <EmptyState
          icon={IconError}
          title="Process Flow Not Found"
          description={
            error?.message ||
            `The requested process flow with ID #${flowId} does not exist or has been removed.`
          }
          action={
            <Button
              type="button"
              variant="primary"
              icon={IconArrowLeft}
              onClick={() => navigate('/configuration/process-flows')}
            >
              Back to Process Flows
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* Page Header */}
      <PageHeader
        title={flow.name}
        icon={IconProcessFlow}
        subtitle="Configure workflow milestone steps, transition rules, and visual diagram."
        backButton={{
          onClick: () => navigate('/configuration/process-flows'),
          label: 'Back to Process Flows',
        }}
        badge={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading font-semibold">
              {flow.moduleCode}
            </span>
            <StatusBadge status={flow.isActive} size="sm" />
          </div>
        }
        actions={
          <div className="flex items-center flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={IconEdit}
              onClick={() => setIsFlowModalOpen(true)}
            >
              Edit Flow
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={IconAdd}
              onClick={openCreateTransitionModal}
              disabled={activeStepsCount < 2}
              title={
                activeStepsCount < 2
                  ? 'At least 2 active steps are required to create a transition'
                  : 'Add Transition'
              }
            >
              Add Transition
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={IconAdd}
              onClick={openCreateStepModal}
            >
              Add Step
            </Button>
          </div>
        }
      />

      {/* Summary metric bar */}
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 flex items-center gap-4 text-xs text-text-muted">
        <div>
          Active Steps:{' '}
          <strong className="text-heading font-mono">{activeStepsCount}</strong>
        </div>
        <div className="h-3 w-px bg-border" />
        <div>
          Active Transitions:{' '}
          <strong className="text-heading font-mono">{activeTransitionsCount}</strong>
        </div>
        {inactiveCount > 0 && (
          <>
            <div className="h-3 w-px bg-border" />
            <div>
              Inactive Items:{' '}
              <strong className="text-heading font-mono text-text-muted">{inactiveCount}</strong>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <ScrollableTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* Tab Panels */}
      {activeTab === 'diagram' && (
        <FlowDiagram
          steps={activeSteps}
          transitions={activeTransitions}
          selectedStepId={selectedStepId}
          selectedTransitionId={selectedTransitionId}
          onStepClick={handleStepClick}
          onTransitionClick={handleTransitionClick}
          onAddStep={openCreateStepModal}
          onDeselect={handleDeselect}
        />
      )}

      {activeTab === 'steps' && (
        <StepsTable
          steps={steps}
          isLoading={isLoading}
          onEdit={openEditStepModal}
        />
      )}

      {activeTab === 'transitions' && (
        <TransitionsTable
          transitions={transitions}
          steps={steps}
          isLoading={isLoading}
          onEdit={openEditTransitionModal}
        />
      )}

      {/* Flow Edit Modal */}
      <FlowFormModal
        isOpen={isFlowModalOpen}
        onClose={() => setIsFlowModalOpen(false)}
        flow={flow}
        onSuccess={refetch}
      />

      {/* Step Add/Edit Modal */}
      <StepFormModal
        isOpen={isStepModalOpen}
        onClose={closeStepModal}
        flowId={flow.id}
        step={editingStep}
        existingSteps={steps}
        onSuccess={refetch}
      />

      {/* Transition Add/Edit Modal */}
      <TransitionFormModal
        isOpen={isTransitionModalOpen}
        onClose={closeTransitionModal}
        flowId={flow.id}
        transition={editingTransition}
        steps={steps}
        existingTransitions={transitions}
        onSuccess={refetch}
      />
    </div>
  );
}
