/**
 * ProductSummaryCards.jsx — KPI metric cards for products dashboard.
 */

import React from 'react';
import { Card, Badge } from '../../../components/ui';
import {
  IconProduct,
  IconCheck,
  IconClock,
  IconClose,
  IconLayers,
} from '../../../constants/icons';

export default function ProductSummaryCards({ summary, isLoading = false }) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-lg border border-border/50" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Total Products',
      value: summary.totalProducts ?? summary.total ?? 0,
      icon: IconProduct,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      label: 'Approved',
      value: summary.approved ?? summary.approvedCount ?? 0,
      icon: IconCheck,
      color: 'text-success bg-success/10 border-success/20',
    },
    {
      label: 'Pending',
      value: summary.pending ?? summary.pendingCount ?? 0,
      icon: IconClock,
      color: 'text-warning bg-warning/10 border-warning/20',
    },
    {
      label: 'Rejected',
      value: summary.rejected ?? summary.rejectedCount ?? 0,
      icon: IconClose,
      color: 'text-danger bg-danger/10 border-danger/20',
    },
    {
      label: 'Active',
      value: summary.active ?? summary.activeCount ?? 0,
      icon: IconCheck,
      color: 'text-info bg-info/10 border-info/20',
    },
    {
      label: 'Total Variants',
      value: summary.variants ?? summary.variantCount ?? 0,
      icon: IconLayers,
      color: 'text-accent bg-accent/10 border-accent/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Card key={idx} padding="sm" className="flex items-center gap-3 border border-border bg-card">
            <div className={`p-2.5 rounded-lg border ${item.color} shrink-0`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate font-medium">{item.label}</p>
              <p className="text-lg font-bold text-foreground tracking-tight">{item.value}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

