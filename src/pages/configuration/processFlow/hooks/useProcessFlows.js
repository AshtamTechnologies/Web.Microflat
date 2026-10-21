import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { processFlowService } from '../../../../services';

/**
 * useProcessFlows — Hook managing the Process Flows list page state.
 */
export default function useProcessFlows() {
  const [flows, setFlows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Modal State
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);

  // Status toggle confirmation modal
  const [flowToToggle, setFlowToToggle] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchFlows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await processFlowService.listFlows();
      setFlows(data || []);
    } catch (err) {
      setError(err);
      toast.error(err?.message || 'Failed to load process flows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  // Client-side filtering
  const filteredFlows = useMemo(() => {
    let result = flows;

    if (statusFilter === 'ACTIVE') {
      result = result.filter((f) => f.isActive);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter((f) => !f.isActive);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.moduleCode?.toLowerCase().includes(q) ||
          f.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [flows, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingFlow(null);
    setIsFlowModalOpen(true);
  };

  const openEditModal = (flow) => {
    setEditingFlow(flow);
    setIsFlowModalOpen(true);
  };

  const closeFlowModal = () => {
    setEditingFlow(null);
    setIsFlowModalOpen(false);
  };

  const requestToggleStatus = (flow) => {
    setFlowToToggle(flow);
  };

  const cancelToggleStatus = () => {
    setFlowToToggle(null);
  };

  const executeToggleStatus = async () => {
    if (!flowToToggle || isTogglingStatus) return;

    setIsTogglingStatus(true);
    try {
      const newStatus = !flowToToggle.isActive;
      await processFlowService.updateFlow(flowToToggle.id, {
        name: flowToToggle.name,
        isActive: newStatus,
      });
      toast.success(
        `Flow "${flowToToggle.name}" ${newStatus ? 'activated' : 'deactivated'}`
      );
      setFlowToToggle(null);
      await fetchFlows();
    } catch (err) {
      toast.error(err?.message || 'Failed to update flow status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return {
    flows,
    filteredFlows,
    isLoading,
    error,
    refetch: fetchFlows,

    // Filter controls
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,

    // Modal controls
    isFlowModalOpen,
    editingFlow,
    openCreateModal,
    openEditModal,
    closeFlowModal,

    // Status toggle controls
    flowToToggle,
    isTogglingStatus,
    requestToggleStatus,
    cancelToggleStatus,
    executeToggleStatus,
  };
}
