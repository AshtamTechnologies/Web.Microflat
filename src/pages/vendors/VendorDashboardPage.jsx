/**
 * VendorDashboardPage — Executive overview of vendor onboarding, approval pipeline, and geographic distribution.
 *
 * Route: /vendors/dashboard
 * Features:
 *   - Live KPI Metrics derived from VendorsContext (Total, Active, Pending Approval, Inactive).
 *   - Visual Recharts:
 *       1. Approval Pipeline (Donut chart with Approved / Pending / Rejected Breakdown).
 *       2. Vendors by Top States (Horizontal bar chart).
 *   - Quick Approvals Workflow panel: 1-click Approve / modal Reject with comment audit.
 *   - Recently Added Vendors stream with direct detail view navigation.
 *   - Responsive layout adapting from 4-across desktop to stacked mobile.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  ChevronRight,
  MapPin,
  Building2,
  Calendar,
  AlertCircle,
  Sparkles,
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
  Card,
  Badge,
  Modal,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { chartColors } from '../../config/chartColors';
import { getStateName } from '../../mocks/vendors';

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
          <strong className="text-heading font-medium">{data.value}</strong> vendors ({data.payload.percentage}%)
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
        <div className="font-semibold text-heading">{data.payload.state}</div>
        <div className="mt-1 text-text-muted font-mono">
          <strong className="text-primary font-bold">{data.value}</strong> registered {data.value === 1 ? 'vendor' : 'vendors'}
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

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const { allVendors, updateVendor } = useVendorsContext();

  // Modal state for rejection workflow
  const [rejectingVendor, setRejectingVendor] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* ── 1. KPI Computations ───────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total = allVendors.length;
    const active = allVendors.filter((v) => v.isActive).length;
    const pending = allVendors.filter((v) => v.approvalStatus === 'Pending').length;
    const inactive = allVendors.filter((v) => !v.isActive).length;

    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

    return {
      total,
      active,
      activePct,
      pending,
      pendingPct,
      inactive,
    };
  }, [allVendors]);

  /* ── 2. Approval Status Breakdown (Pie/Donut Data) ────────────────────────── */
  const approvalChartData = useMemo(() => {
    const total = allVendors.length || 1;
    const approvedCount = allVendors.filter((v) => v.approvalStatus === 'Approved').length;
    const pendingCount = allVendors.filter((v) => v.approvalStatus === 'Pending').length;
    const rejectedCount = allVendors.filter((v) => v.approvalStatus === 'Rejected').length;

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
  }, [allVendors]);

  /* ── 3. Vendors by State Breakdown (Top 6 Bar Chart Data) ─────────────────── */
  const stateChartData = useMemo(() => {
    const countsByState = {};

    allVendors.forEach((v) => {
      let stateName = v.stateId ? getStateName(v.countryId, v.stateId) : 'Unknown';
      if (!stateName || stateName === '—') {
        stateName = v.city || 'Other';
      }
      countsByState[stateName] = (countsByState[stateName] || 0) + 1;
    });

    const entries = Object.entries(countsByState).map(([state, count]) => ({
      state,
      count,
    }));

    // Sort descending by count and take top 6
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 6);
  }, [allVendors]);

  /* ── 4. Pending Approvals List (Up to 5) ──────────────────────────────────── */
  const pendingApprovals = useMemo(() => {
    return allVendors.filter((v) => v.approvalStatus === 'Pending').slice(0, 5);
  }, [allVendors]);

  /* ── 5. Recently Added Vendors List (Up to 5) ────────────────────────────── */
  const recentlyAddedVendors = useMemo(() => {
    const sorted = [...allVendors].sort((a, b) => {
      const dateA = new Date(a.createdOn || a.effectiveDate || 0).getTime();
      const dateB = new Date(b.createdOn || b.effectiveDate || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      // Fallback by ID
      const numA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    });
    return sorted.slice(0, 5);
  }, [allVendors]);

  /* ── Approve Handler ──────────────────────────────────────────────────────── */
  async function handleApprove(vendor) {
    try {
      await updateVendor(vendor.id, {
        approvalStatus: 'Approved',
        approvedBy: 'Ian Chesnut',
        approvedOn: new Date().toISOString().slice(0, 10),
      });
      toast.success('Vendor approved');
    } catch {
      // Handled via toast
    }
  }

  /* ── Open Reject Modal ────────────────────────────────────────────────────── */
  function handleOpenRejectModal(vendor) {
    setRejectingVendor(vendor);
    setRejectComments('');
  }

  /* ── Confirm Reject Handler ──────────────────────────────────────────────── */
  async function handleConfirmReject() {
    if (!rejectingVendor) return;
    setActionLoading(true);
    try {
      await updateVendor(rejectingVendor.id, {
        approvalStatus: 'Rejected',
        approvedBy: 'Ian Chesnut',
        approvedByComments: rejectComments.trim() || 'Vendor compliance audit was not cleared.',
        approvedOn: new Date().toISOString().slice(0, 10),
      });
      toast.success('Vendor rejected');
      setRejectingVendor(null);
      setRejectComments('');
    } catch {
      // Handled
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-12">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-heading tracking-tight flex items-center gap-2 sm:gap-2.5">
            <Truck className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">Vendor Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5 sm:mt-1">
            Overview of vendor onboarding and approvals
          </p>
        </div>

        {/* Top-Right Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/vendors/new" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto shadow-xs justify-center">
              <Plus size={16} className="mr-1.5 shrink-0" aria-hidden="true" />
              <span>Add Vendor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 2. KPI Metrics Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Vendors */}
        <MetricCard
          label="Total Vendors"
          value={kpis.total}
          subtext="Registered in directory"
          icon={Building2}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          title="Click to view all vendors"
          onClick={() => navigate('/vendors?filter=ALL')}
        />

        {/* Active Vendors */}
        <MetricCard
          label="Active"
          value={kpis.active}
          subtext={`${kpis.activePct}% of total suppliers`}
          icon={CheckCircle2}
          iconBg="bg-success/10"
          iconColor="text-success"
          title="Click to view active vendors"
          onClick={() => navigate('/vendors?status=ACTIVE&approval=ALL')}
        />

        {/* Pending Approval */}
        <MetricCard
          label="Pending Approval"
          value={kpis.pending}
          subtext={kpis.pending > 0 ? 'Requires QA verification' : 'All reviews cleared'}
          icon={Clock}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          title="Click to view pending approval vendors"
          onClick={() => navigate('/vendors?status=ALL&approval=Pending')}
        />

        {/* Inactive Vendors */}
        <MetricCard
          label="Inactive"
          value={kpis.inactive}
          subtext="Temporarily suspended"
          icon={XCircle}
          iconBg="bg-danger/10"
          iconColor="text-danger"
          title="Click to view inactive vendors"
          onClick={() => navigate('/vendors?status=INACTIVE&approval=ALL')}
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
              {allVendors.length} Total
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
                  {allVendors.length}
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-text-muted mt-0.5">Vendors</span>
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
                    <span className="text-[11px] text-text-muted">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Chart B: Vendors by State Horizontal Bar Chart */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-semibold text-heading truncate">Vendors by State</h2>
              <p className="text-xs text-text-muted truncate">Top 6 geographic hubs</p>
            </div>
            <span className="text-xs text-text-muted font-medium shrink-0">Top States</span>
          </div>

          <div className="h-[210px] sm:h-[240px] w-full pt-1">
            {stateChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stateChartData}
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
                    dataKey="state"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={85}
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
                No state records available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── 4 & 5. Panels Row: Pending Approvals + Recently Added Vendors ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Panel 4: Pending Approvals */}
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
                <p className="text-xs font-semibold text-heading">No vendors awaiting approval</p>
                <p className="text-[11px] text-text-muted">All supplier compliance reviews are up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-border -mx-3 sm:-mx-5">
                {pendingApprovals.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-surface/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                        <Link
                          to={`/vendors/${vendor.id}`}
                          state={{ from: '/vendors/dashboard', backLabel: 'Back to Vendor Dashboard' }}
                          className="text-xs sm:text-sm font-semibold text-heading hover:text-primary transition-colors truncate"
                          title={vendor.vendorName}
                        >
                          {vendor.vendorName}
                        </Link>
                        <span className="font-mono text-[10px] sm:text-[10.5px] px-1.5 py-0.5 bg-surface border border-border text-text rounded font-medium shrink-0">
                          {vendor.vendorCode}
                        </span>
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] text-text-muted flex items-center gap-1.5 font-mono flex-wrap">
                        <Calendar size={11} className="shrink-0" />
                        <span>Submitted: {vendor.createdOn ? vendor.createdOn.slice(0, 10) : vendor.effectiveDate || 'Recent'}</span>
                        {vendor.city && (
                          <>
                            <span>•</span>
                            <span className="truncate">{vendor.city}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Action buttons (Approve / Reject) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApprove(vendor)}
                        title="Approve Vendor"
                        className="p-1.5 sm:p-2 rounded-lg text-success hover:bg-success/10 border border-success/30 transition-colors cursor-pointer active:scale-95"
                        aria-label={`Approve ${vendor.vendorName}`}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(vendor)}
                        title="Reject Vendor"
                        className="p-1.5 sm:p-2 rounded-lg text-danger hover:bg-danger/10 border border-danger/30 transition-colors cursor-pointer active:scale-95"
                        aria-label={`Reject ${vendor.vendorName}`}
                      >
                        <X size={14} strokeWidth={2.5} />
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
              to="/vendors?status=ALL&approval=Pending"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group/link"
            >
              <span>View all in directory</span>
              <ChevronRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>

        {/* Panel 5: Recently Added Vendors */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div>
            <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Sparkles size={16} className="text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-heading truncate">Recently Added Vendors</h2>
              </div>
              <span className="text-xs text-text-muted font-normal shrink-0">Latest Onboarding</span>
            </div>

            {recentlyAddedVendors.length === 0 ? (
              <div className="py-10 sm:py-12 text-center text-text-muted">
                <p className="text-xs font-medium">No vendors registered yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border -mx-3 sm:-mx-5">
                {recentlyAddedVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    onClick={() => navigate(`/vendors/${vendor.id}`, { state: { from: '/vendors/dashboard', backLabel: 'Back to Vendor Dashboard' } })}
                    className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-surface/60 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs sm:text-sm font-semibold text-heading group-hover:text-primary transition-colors truncate">
                          {vendor.vendorName}
                        </span>
                        <span className="font-mono text-[10px] sm:text-[10.5px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-medium shrink-0">
                          {vendor.vendorCode}
                        </span>
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] text-text-muted flex items-center gap-1.5 flex-wrap">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{vendor.city || 'Unknown Location'}</span>
                        <span>•</span>
                        <span className="font-mono text-text-muted">{vendor.effectiveDate || '—'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <Badge variant={vendor.isActive ? 'active' : 'inactive'} className="text-[10.5px] sm:text-xs">
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <ChevronRight size={14} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom link */}
          <div className="pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4 flex items-center justify-end">
            <Link
              to="/vendors"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group/link"
            >
              <span>View all vendors</span>
              <ChevronRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Rejection Comments Modal ── */}
      {rejectingVendor && (
        <Modal
          isOpen={Boolean(rejectingVendor)}
          onClose={() => setRejectingVendor(null)}
          title="Reject Vendor Application"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                You are marking <strong className="font-semibold">{rejectingVendor.vendorName}</strong> ({rejectingVendor.vendorCode}) as <strong>Rejected</strong>.
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rejectionComments" className="text-xs font-semibold text-heading block">
                Rejection Reason / QA Audit Comments <span className="text-danger">*</span>
              </label>
              <textarea
                id="rejectionComments"
                rows={3}
                required
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Specify reasons for rejection (e.g., GST registration mismatch, surface tolerance failed quality inspection)..."
                className="w-full text-xs p-3 rounded-lg border border-border bg-bg text-text outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger transition-colors placeholder:text-text-muted"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setRejectingVendor(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="w-full sm:w-auto"
                loading={actionLoading}
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
