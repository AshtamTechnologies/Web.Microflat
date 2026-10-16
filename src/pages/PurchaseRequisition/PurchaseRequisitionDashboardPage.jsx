/**
 * PurchaseRequisitionDashboardPage — Executive overview of purchase requisitions, approval pipeline, and department distributions.
 *
 * Route: /purchase-requisition/dashboard
 * Features:
 *   - Live KPI Metrics derived from PurchaseRequisitionContext (Total, Pending, Approved, Rejected).
 *   - Visual Recharts:
 *       1. Approval Pipeline (Donut chart with Approved / Pending / Rejected Breakdown).
 *       2. Requisitions by Department (Horizontal bar chart).
 *   - Quick Approvals Workflow panel: 1-click Approve / modal Reject with comment audit.
 *   - Recently Created Requisitions stream with direct detail view navigation.
 *   - Responsive layout adapting from 4-across desktop to stacked mobile.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  ChevronRight,
  Calendar,
  AlertCircle,
  Sparkles,
  Layers,
  Building2,
  FileText,
  User,
  Package,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

import {
  Button,
  CancelButton,
  Card,
  Badge,
  Modal,
  PageHeader,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import { chartColors } from '../../config/chartColors';
import {
  formatPRDate,
  getPRStatusBadgeVariant,
  getProjectName,
} from '../../mocks/purchaseRequisitions';
import { IconPR } from '../../constants/icons';

/* ── Custom Pie Tooltip ─────────────────────────────────────────────────────── */
function CustomPieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-bg/95 backdrop-blur-md border border-border px-3 py-2 rounded-xl shadow-lg text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.payload.color }}
          />
          <span className="font-semibold text-heading">{data.name}</span>
        </div>
        <div className="mt-1 text-text-muted font-mono">
          <strong className="text-heading font-medium">{data.value}</strong> PRs ({data.payload.percentage}%)
        </div>
      </div>
    );
  }
  return null;
}

/* ── Custom Bar Tooltip ─────────────────────────────────────────────────────── */
function CustomBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-bg/95 backdrop-blur-md border border-border px-3 py-2 rounded-xl shadow-lg text-xs">
        <div className="font-semibold text-heading">{data.payload.department}</div>
        <div className="mt-1 text-text-muted font-mono">
          <strong className="text-primary font-bold">{data.value}</strong> {data.value === 1 ? 'requisition' : 'requisitions'}
        </div>
      </div>
    );
  }
  return null;
}

/* ── KPI Metric Card Component ──────────────────────────────────────────────── */
function MetricCard({ label, value, subtext, icon: Icon, iconColor, iconBg, trend, onClick, title }) {
  return (
    <Card
      padding="md"
      onClick={onClick}
      className={`bg-bg relative overflow-hidden group transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
          : ''
      }`}
      title={title || (onClick ? `Filter by ${label}` : undefined)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block truncate">
              {label}
            </span>
            {onClick && (
              <ChevronRight
                size={14}
                className="text-text-muted opacity-0 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-heading">
            {value}
          </div>
          {subtext && (
            <p className="text-xs text-text-muted flex items-center gap-1 truncate">
              {trend}
              <span>{subtext}</span>
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

export default function PurchaseRequisitionDashboardPage() {
  const navigate = useNavigate();
  const { requisitions, approvePR, rejectPR } = usePurchaseRequisitionContext();

  // Modal state for rejection workflow
  const [rejectingPR, setRejectingPR] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* ── 1. KPI Computations ───────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total = requisitions.length;
    const pending = requisitions.filter((r) => (r.status || '').toLowerCase().includes('pending')).length;
    const approved = requisitions.filter((r) => (r.status || '').toLowerCase() === 'approved').length;
    const rejected = requisitions.filter((r) => (r.status || '').toLowerCase() === 'rejected').length;

    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

    return {
      total,
      pending,
      pendingPct,
      approved,
      approvedPct,
      rejected,
    };
  }, [requisitions]);

  /* ── 2. Approval Status Breakdown (Pie/Donut Data) ────────────────────────── */
  const approvalChartData = useMemo(() => {
    const total = requisitions.length || 1;
    const approvedCount = requisitions.filter((r) => (r.status || '').toLowerCase() === 'approved').length;
    const pendingCount = requisitions.filter((r) => (r.status || '').toLowerCase().includes('pending')).length;
    const rejectedCount = requisitions.filter((r) => (r.status || '').toLowerCase() === 'rejected').length;

    return [
      {
        name: 'Approved',
        value: approvedCount,
        percentage: Math.round((approvedCount / total) * 100),
        color: chartColors.success,
      },
      {
        name: 'Pending',
        value: pendingCount,
        percentage: Math.round((pendingCount / total) * 100),
        color: chartColors.warning,
      },
      {
        name: 'Rejected',
        value: rejectedCount,
        percentage: Math.round((rejectedCount / total) * 100),
        color: chartColors.danger,
      },
    ];
  }, [requisitions]);

  /* ── 3. Requisitions by Department Breakdown (Top 6 Bar Chart Data) ────────── */
  const departmentChartData = useMemo(() => {
    const countsByDept = {};

    requisitions.forEach((r) => {
      const dept = r.department || 'General';
      countsByDept[dept] = (countsByDept[dept] || 0) + 1;
    });

    const entries = Object.entries(countsByDept).map(([department, count]) => ({
      department,
      count,
    }));

    // Sort descending by count and take top 6
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 6);
  }, [requisitions]);

  /* ── 4. Pending Approvals List (Up to 5) ──────────────────────────────────── */
  const pendingApprovals = useMemo(() => {
    return requisitions
      .filter((r) => (r.status || '').toLowerCase().includes('pending'))
      .slice(0, 5);
  }, [requisitions]);

  /* ── 5. Recently Created Requisitions List (Up to 5) ─────────────────────── */
  const recentlyCreatedPRs = useMemo(() => {
    const sorted = [...requisitions].sort((a, b) => {
      const dateA = new Date(a.prDate || a.createdDate || 0).getTime();
      const dateB = new Date(b.prDate || b.createdDate || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return String(b.prNumber || '').localeCompare(String(a.prNumber || ''));
    });
    return sorted.slice(0, 5);
  }, [requisitions]);

  /* ── Approve Handler ──────────────────────────────────────────────────────── */
  async function handleApprove(pr) {
    try {
      await approvePR(pr.prNumber || pr.prId, {
        approvedBy: 'Ian Chesnut',
        remarks: 'Approved directly from Purchase Requisition Dashboard',
      });
      toast.success(`Purchase Requisition ${pr.prNumber} approved`);
    } catch {
      toast.error('Failed to approve requisition');
    }
  }

  /* ── Open Reject Modal ────────────────────────────────────────────────────── */
  function handleOpenRejectModal(pr) {
    setRejectingPR(pr);
    setRejectComments('');
  }

  /* ── Confirm Reject Handler ──────────────────────────────────────────────── */
  async function handleConfirmReject() {
    if (!rejectingPR) return;
    if (!rejectComments.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await rejectPR(rejectingPR.prNumber || rejectingPR.prId, {
        rejectedBy: 'Ian Chesnut',
        rejectionReason: rejectComments.trim(),
      });
      toast.success(`Purchase Requisition ${rejectingPR.prNumber} rejected`);
      setRejectingPR(null);
      setRejectComments('');
    } catch {
      toast.error('Failed to reject requisition');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-8 sm:pb-12">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="Purchase Requisition Dashboard"
        subtitle="Overview of requisition pipelines, department allocations, and approvals."
        icon={<IconPR className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden="true" />}
        actions={
          <Link to="/purchase-requisition/create" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto shadow-xs justify-center">
              <Plus size={16} className="mr-1.5 shrink-0" aria-hidden="true" />
              <span>Create PR</span>
            </Button>
          </Link>
        }
      />

      {/* ── 2. KPI Metrics Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total PRs */}
        <MetricCard
          label="Total Requisitions"
          value={kpis.total}
          subtext="Created across departments"
          icon={Layers}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          title="Click to view all purchase requisitions"
          onClick={() => navigate('/purchase-requisition?status=ALL')}
        />

        {/* Pending Approval */}
        <MetricCard
          label="Pending Approval"
          value={kpis.pending}
          subtext={kpis.pending > 0 ? 'Requires manager review' : 'All reviews cleared'}
          icon={Clock}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          title="Click to view pending requisitions"
          onClick={() => navigate('/purchase-requisition?status=Pending Approval')}
        />

        {/* Approved PRs */}
        <MetricCard
          label="Approved"
          value={kpis.approved}
          subtext={`${kpis.approvedPct}% approval rate`}
          icon={CheckCircle2}
          iconBg="bg-success/10"
          iconColor="text-success"
          title="Click to view approved requisitions"
          onClick={() => navigate('/purchase-requisition?status=Approved')}
        />

        {/* Rejected PRs */}
        <MetricCard
          label="Rejected"
          value={kpis.rejected}
          subtext="Requires revision"
          icon={XCircle}
          iconBg="bg-danger/10"
          iconColor="text-danger"
          title="Click to view rejected requisitions"
          onClick={() => navigate('/purchase-requisition?status=Rejected')}
        />
      </div>

      {/* ── 3. Charts Row (2 Cards Side-by-Side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart A: Approval Status Donut */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-semibold text-heading truncate">Approval Status</h2>
              <p className="text-xs text-text-muted truncate">Breakdown by current review state</p>
            </div>
            <span className="text-xs font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border shrink-0">
              {requisitions.length} Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center min-h-[220px] sm:min-h-[240px]">
            {/* Donut Chart */}
            <div className="sm:col-span-7 h-[190px] sm:h-[220px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalChartData}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {approvalChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={chartColors.bg} strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl sm:text-2xl font-bold font-mono text-heading leading-none">
                  {requisitions.length}
                </span>
                <span className="text-2xs text-text-muted mt-0.5">Requisitions</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="sm:col-span-5 flex flex-col justify-center space-y-2.5 sm:space-y-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 pl-0 sm:pl-2">
              {approvalChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-heading">{item.name}</span>
                  </div>
                  <div className="font-mono text-text-muted flex items-center gap-1.5">
                    <span className="font-semibold text-heading">{item.value}</span>
                    <span className="text-2xs text-text-muted">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Chart B: Requisitions by Department Horizontal Bar Chart */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-semibold text-heading truncate">Requisitions by Department</h2>
              <p className="text-xs text-text-muted truncate">Top requesting departments</p>
            </div>
            <span className="text-xs text-text-muted font-medium shrink-0">Top Depts</span>
          </div>

          <div className="h-[210px] sm:h-[240px] w-full pt-1">
            {departmentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: -5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gray200} horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: chartColors.gray500, fontFamily: 'var(--font-mono)' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="department"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={95}
                    tick={{ fontSize: 11, fill: chartColors.heading, fontWeight: 500 }}
                  />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={chartColors.brand500}
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                No department records available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── 4 & 5. Panels Row: Pending Approvals + Recently Added Requisitions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Panel 4: Pending Approvals Workflow */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div>
            <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Clock size={16} className="text-warning shrink-0" />
                <h2 className="text-sm font-semibold text-heading truncate">Pending Approvals</h2>
              </div>
              <Badge variant={pendingApprovals.length > 0 ? 'warning' : 'neutral'} className="shrink-0">
                {kpis.pending} Awaiting
              </Badge>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="py-10 sm:py-12 text-center text-text-muted space-y-2">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-xs font-semibold text-heading">No requisitions awaiting approval</p>
                <p className="text-2xs text-text-muted">All purchase requisitions are up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-border -mx-3 sm:-mx-5">
                {pendingApprovals.map((pr) => (
                  <div
                    key={pr.prId}
                    className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-surface/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                        <Link
                          to={`/purchase-requisition/${pr.prNumber || pr.prId}`}
                          state={{ from: '/purchase-requisition/dashboard', backLabel: 'PR Dashboard', isApprovalView: true, readOnly: true }}
                          className="text-xs sm:text-sm font-semibold text-heading hover:text-primary transition-colors truncate font-mono"
                          title={pr.prNumber}
                        >
                          {pr.prNumber}
                        </Link>
                        {pr.projectId && (
                          <span
                            className="font-mono text-2xs px-1.5 py-0.5 bg-surface border border-border text-text rounded font-medium shrink-0"
                            title={getProjectName(pr.projectId)}
                          >
                            {pr.projectId}
                          </span>
                        )}
                        <span className="text-2xs px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-medium shrink-0">
                          {pr.department}
                        </span>
                      </div>
                      <p className="text-2xs text-text-muted flex items-center gap-1.5 font-mono flex-wrap">
                        <Calendar size={11} className="shrink-0" />
                        <span>Date: {formatPRDate(pr.prDate)}</span>
                        <span>•</span>
                        <User size={11} className="shrink-0" />
                        <span className="truncate">{pr.requestedBy}</span>
                        {pr.items && (
                          <>
                            <span>•</span>
                            <Package size={11} className="shrink-0" />
                            <span>{pr.items.length} {pr.items.length === 1 ? 'item' : 'items'}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Action button (View requisition approval) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`, {
                            state: { from: '/purchase-requisition/dashboard', backLabel: 'PR Dashboard', isApprovalView: true, readOnly: true },
                          })
                        }
                        title="View Requisition Approval"
                        className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-primary hover:bg-surface border border-border transition-colors cursor-pointer active:scale-95"
                        aria-label={`View ${pr.prNumber}`}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom link */}
          <div className="pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4 flex items-center justify-end">
            <Link
              to="/purchase-requisition?status=Pending Approval"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group/link"
            >
              <span>View all pending in list</span>
              <ChevronRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>

        {/* Panel 5: Recently Created Requisitions */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div>
            <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Sparkles size={16} className="text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-heading truncate">Recent Requisitions</h2>
              </div>
              <span className="text-xs text-text-muted font-normal shrink-0">Latest Activity</span>
            </div>

            {recentlyCreatedPRs.length === 0 ? (
              <div className="py-10 sm:py-12 text-center text-text-muted">
                <p className="text-xs font-medium">No purchase requisitions created yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border -mx-3 sm:-mx-5">
                {recentlyCreatedPRs.map((pr) => {
                  const statusVariant = getPRStatusBadgeVariant(pr.status);

                  return (
                    <div
                      key={pr.prId}
                      onClick={() =>
                        navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`, {
                          state: { from: '/purchase-requisition/dashboard', backLabel: 'PR Dashboard' },
                        })
                      }
                      className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-surface/60 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                          <span className="text-xs sm:text-sm font-semibold text-heading group-hover:text-primary transition-colors truncate font-mono">
                            {pr.prNumber}
                          </span>
                          {pr.projectId && (
                            <span
                              className="font-mono text-2xs px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-medium shrink-0"
                              title={getProjectName(pr.projectId)}
                            >
                              {pr.projectId}
                            </span>
                          )}
                          <span className="text-2xs text-text-muted truncate">
                            {pr.department}
                          </span>
                        </div>
                        <p className="text-2xs text-text-muted flex items-center gap-1.5 font-mono flex-wrap">
                          <Calendar size={11} className="shrink-0" />
                          <span>{formatPRDate(pr.prDate)}</span>
                          <span>•</span>
                          <span className="truncate">{pr.requestedBy}</span>
                          {pr.items && (
                            <>
                              <span>•</span>
                              <span>{pr.items.length} {pr.items.length === 1 ? 'item' : 'items'}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={statusVariant} className="text-2xs font-medium">
                          {pr.status}
                        </Badge>
                        <ChevronRight
                          size={15}
                          className="text-text-muted opacity-40 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom link */}
          <div className="pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4 flex items-center justify-end">
            <Link
              to="/purchase-requisition"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group/link"
            >
              <span>View full directory</span>
              <ChevronRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Rejection Modal ── */}
      {rejectingPR && (
        <Modal
          isOpen={Boolean(rejectingPR)}
          onClose={() => {
            if (!actionLoading) {
              setRejectingPR(null);
              setRejectComments('');
            }
          }}
          title="Reject Purchase Requisition"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
              <div className="text-xs text-danger space-y-0.5">
                <p className="font-semibold">
                  You are rejecting {rejectingPR.prNumber}
                </p>
                <p>
                  Requested by {rejectingPR.requestedBy} for {rejectingPR.department}. Please provide an audit reason for rejection.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reject-comments"
                className="text-xs font-semibold text-heading block"
              >
                Rejection Reason <span className="text-danger">*</span>
              </label>
              <textarea
                id="reject-comments"
                rows={3}
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="e.g. Budget exceeded, missing vendor quotation, duplicate request..."
                className="w-full text-xs p-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-1 focus:ring-danger focus:border-danger transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <CancelButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRejectingPR(null);
                  setRejectComments('');
                }}
                disabled={actionLoading}
              />
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectComments.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
