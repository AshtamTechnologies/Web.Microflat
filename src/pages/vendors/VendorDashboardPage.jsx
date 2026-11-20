/**
 * VendorDashboardPage — Executive overview of vendor onboarding, approval pipeline, and geographic distribution.
 *
 * Route: /vendors/dashboard
 * Static Executive Dashboard with:
 *   - Static KPI Metrics (Total, Active, Pending Approval, Inactive).
 *   - Visual Recharts:
 *       1. Approval Pipeline (Donut chart with Approved / Pending / Rejected Breakdown).
 *       2. Vendors by Top States (Horizontal bar chart).
 *   - Interactive Pending Approvals panel.
 *   - Recently Added Vendors stream.
 *   - Responsive layout adapting from 4-across desktop to stacked mobile.
 */

import { useState } from 'react';
import {
  IconAdd,
  IconBuilding2,
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconError,
  IconLocation,
  IconSparkles,
  IconSuccess,
  IconVendor,
  IconView,
  IconXCircle,
} from '../../constants/icons';
import { Link, useNavigate } from 'react-router-dom';
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
  Textarea,
  IconButton,
} from '../../components/ui';
import { chartColors } from '../../config/chartColors';
import { formatDate } from '../../utils/dateUtils';

/* ── Static Dashboard Datasets ────────────────────────────────────────────── */
const STATIC_KPIS = {
  total: 48,
  active: 42,
  activePct: 88,
  pending: 4,
  pendingPct: 8,
  inactive: 2,
};

const STATIC_APPROVAL_CHART_DATA = [
  {
    name: 'Approved',
    value: 42,
    percentage: 88,
    color: chartColors.success,
  },
  {
    name: 'Pending',
    value: 4,
    percentage: 8,
    color: chartColors.warning,
  },
  {
    name: 'Rejected',
    value: 2,
    percentage: 4,
    color: chartColors.danger,
  },
];

const STATIC_STATE_CHART_DATA = [
  { state: 'Gujarat', count: 18 },
  { state: 'Maharashtra', count: 12 },
  { state: 'Karnataka', count: 8 },
  { state: 'Tamil Nadu', count: 5 },
  { state: 'Delhi NCR', count: 3 },
  { state: 'Rajasthan', count: 2 },
];

const INITIAL_PENDING_APPROVALS = [
  {
    id: 1049,
    vendorName: 'Apex Precision Tools Ltd.',
    vendorCode: 'VND-1049',
    city: 'Pune, Maharashtra',
    effectiveDate: '2026-11-18',
    createdOn: '2026-11-18',
    category: 'CNC Machining',
  },
  {
    id: 1050,
    vendorName: 'Surat Steel & Forgings',
    vendorCode: 'VND-1050',
    city: 'Surat, Gujarat',
    effectiveDate: '2026-11-17',
    createdOn: '2026-11-17',
    category: 'Raw Material',
  },
  {
    id: 1051,
    vendorName: 'Zenith Hydraulics & Valves',
    vendorCode: 'VND-1051',
    city: 'Bengaluru, Karnataka',
    effectiveDate: '2026-11-15',
    createdOn: '2026-11-15',
    category: 'Hydraulic Parts',
  },
  {
    id: 1052,
    vendorName: 'Krupa Electro-Platers',
    vendorCode: 'VND-1052',
    city: 'Ahmedabad, Gujarat',
    effectiveDate: '2026-11-14',
    createdOn: '2026-11-14',
    category: 'Surface Treatment',
  },
];

const STATIC_RECENTLY_ADDED_VENDORS = [
  {
    id: 1048,
    vendorName: 'Precision Castings Pvt Ltd',
    vendorCode: 'VND-1048',
    city: 'Rajkot, Gujarat',
    effectiveDate: '2026-11-12',
    createdOn: '2026-11-12',
    isActive: true,
  },
  {
    id: 1047,
    vendorName: 'Bharat Fasteners & Hardware',
    vendorCode: 'VND-1047',
    city: 'Mumbai, Maharashtra',
    effectiveDate: '2026-11-10',
    createdOn: '2026-11-10',
    isActive: true,
  },
  {
    id: 1046,
    vendorName: 'Mechatronics Automations',
    vendorCode: 'VND-1046',
    city: 'Vadodara, Gujarat',
    effectiveDate: '2026-11-08',
    createdOn: '2026-11-08',
    isActive: true,
  },
  {
    id: 1045,
    vendorName: 'Sterling Polymer Solutions',
    vendorCode: 'VND-1045',
    city: 'Chennai, Tamil Nadu',
    effectiveDate: '2026-11-05',
    createdOn: '2026-11-05',
    isActive: true,
  },
  {
    id: 1044,
    vendorName: 'Acu-Tech Calibration Labs',
    vendorCode: 'VND-1044',
    city: 'Bengaluru, Karnataka',
    effectiveDate: '2026-11-02',
    createdOn: '2026-11-02',
    isActive: false,
  },
];

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
              <IconChevronRight
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
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

export default function VendorDashboardPage() {
  const navigate = useNavigate();

  // Interactive pending approvals list
  const [pendingApprovals, setPendingApprovals] = useState(INITIAL_PENDING_APPROVALS);

  // Modal state for rejection workflow
  const [rejectingVendor, setRejectingVendor] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Confirm Reject Handler ──────────────────────────────────────────────── */
  function handleConfirmReject() {
    if (!rejectingVendor) return;
    setActionLoading(true);
    setTimeout(() => {
      setPendingApprovals((prev) => prev.filter((v) => v.id !== rejectingVendor.id));
      toast.success(`Vendor ${rejectingVendor.vendorName} rejected`);
      setRejectingVendor(null);
      setRejectComments('');
      setActionLoading(false);
    }, 300);
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-8 sm:pb-12">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="Vendor Dashboard"
        subtitle="Overview of vendor onboarding and approvals"
        icon={<IconVendor className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden="true" />}
        showProcessFlow={false}
        actions={
          <Link to="/vendors/new" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto shadow-xs justify-center">
              <IconAdd size={16} className="mr-1.5 shrink-0" aria-hidden="true" />
              <span>Add Vendor</span>
            </Button>
          </Link>
        }
      />

      {/* ── 2. KPI Metrics Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Vendors */}
        <MetricCard
          label="Total Vendors"
          value={STATIC_KPIS.total}
          subtext="Registered in directory"
          icon={IconBuilding2}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          title="Click to view all vendors"
          onClick={() => navigate('/vendors?filter=ALL')}
        />

        {/* Active Vendors */}
        <MetricCard
          label="Active"
          value={STATIC_KPIS.active}
          subtext={`${STATIC_KPIS.activePct}% of total suppliers`}
          icon={IconSuccess}
          iconBg="bg-success/10"
          iconColor="text-success"
          title="Click to view active vendors"
          onClick={() => navigate('/vendors?status=ACTIVE&approval=ALL')}
        />

        {/* Pending Approval */}
        <MetricCard
          label="Pending Approval"
          value={pendingApprovals.length}
          subtext={pendingApprovals.length > 0 ? 'Requires QA verification' : 'All reviews cleared'}
          icon={IconClock}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          title="Click to view pending approval vendors"
          onClick={() => navigate('/vendors?status=ALL&approval=Pending')}
        />

        {/* Inactive Vendors */}
        <MetricCard
          label="Inactive"
          value={STATIC_KPIS.inactive}
          subtext="Temporarily suspended"
          icon={IconXCircle}
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
              {STATIC_KPIS.total} Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center min-h-[220px] sm:min-h-[240px]">
            {/* Donut Chart */}
            <div className="sm:col-span-7 h-[190px] sm:h-[220px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STATIC_APPROVAL_CHART_DATA}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {STATIC_APPROVAL_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={chartColors.bg} strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl sm:text-2xl font-bold font-mono text-heading leading-none">
                  {STATIC_KPIS.total}
                </span>
                <span className="text-2xs sm:text-2xs text-text-muted mt-0.5">Vendors</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="sm:col-span-5 flex flex-col justify-center space-y-2.5 sm:space-y-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 pl-0 sm:pl-2">
              {STATIC_APPROVAL_CHART_DATA.map((item) => (
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={STATIC_STATE_CHART_DATA}
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
                <IconClock size={16} className="text-warning shrink-0" />
                <h2 className="text-sm font-semibold text-heading truncate">Pending Approvals</h2>
              </div>
              <Badge variant={pendingApprovals.length > 0 ? 'warning' : 'neutral'} className="shrink-0">
                {pendingApprovals.length} Awaiting
              </Badge>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="py-10 sm:py-12 text-center text-text-muted space-y-2">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-2">
                  <IconSuccess size={20} />
                </div>
                <p className="text-xs font-semibold text-heading">No vendors awaiting approval</p>
                <p className="text-2xs text-text-muted">All supplier compliance reviews are up to date.</p>
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
                          to={`/vendors/${vendor.id}/effective-dates`}
                          state={{ from: '/vendors/dashboard', backLabel: 'Vendor Dashboard', readOnly: true, isApprovalView: true }}
                          className="text-xs sm:text-sm font-semibold text-heading hover:text-primary transition-colors truncate"
                          title={vendor.vendorName}
                        >
                          {vendor.vendorName}
                        </Link>
                        <span className="font-mono text-2xs px-1.5 py-0.5 bg-surface border border-border text-text rounded font-medium shrink-0">
                          {vendor.vendorCode}
                        </span>
                      </div>
                      <p className="text-2xs text-text-muted flex items-center gap-1.5 font-mono flex-wrap">
                        <IconCalendar size={11} className="shrink-0" />
                        <span>Submitted: {formatDate(vendor.createdOn || vendor.effectiveDate)}</span>
                        {vendor.city && (
                          <>
                            <span>•</span>
                            <span className="truncate">{vendor.city}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Action button (View vendor approval) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <IconButton
                        icon={IconView}
                        size="sm"
                        variant="ghost"
                        title="View Vendor Approval"
                        aria-label={`View ${vendor.vendorName}`}
                        onClick={() =>
                          navigate(`/vendors/${vendor.id}/effective-dates`, {
                            state: { from: '/vendors/dashboard', backLabel: 'Vendor Dashboard', readOnly: true, isApprovalView: true },
                          })
                        }
                      />
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
              <IconChevronRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>

        {/* Panel 5: Recently Added Vendors */}
        <Card padding="md" className="bg-bg flex flex-col justify-between">
          <div>
            <div className="border-b border-border pb-3 mb-3 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <IconSparkles size={16} className="text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-heading truncate">Recently Added Vendors</h2>
              </div>
              <span className="text-xs text-text-muted font-normal shrink-0">Latest Onboarding</span>
            </div>

            <div className="divide-y divide-border -mx-3 sm:-mx-5">
              {STATIC_RECENTLY_ADDED_VENDORS.map((vendor) => (
                <div
                  key={vendor.id}
                  onClick={() =>
                    navigate(`/vendors/${vendor.id}/effective-dates`, {
                      state: { from: '/vendors/dashboard', backLabel: 'Vendor Dashboard', readOnly: true },
                    })
                  }
                  className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-surface/60 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs sm:text-sm font-semibold text-heading group-hover:text-primary transition-colors truncate">
                        {vendor.vendorName}
                      </span>
                      <span className="font-mono text-2xs px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-medium shrink-0">
                        {vendor.vendorCode}
                      </span>
                    </div>
                    <p className="text-2xs text-text-muted flex items-center gap-1.5 flex-wrap">
                      <IconLocation size={11} className="shrink-0" />
                      <span className="truncate">{vendor.city || 'Unknown Location'}</span>
                      <span>•</span>
                      <span className="font-mono text-text-muted">{formatDate(vendor.effectiveDate || vendor.createdOn)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Badge variant={vendor.isActive ? 'active' : 'inactive'} className="text-2xs sm:text-xs">
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <IconChevronRight size={14} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom link */}
          <div className="pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4 flex items-center justify-end">
            <Link
              to="/vendors"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group/link"
            >
              <span>View all vendors</span>
              <IconChevronRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
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
              <IconError size={16} className="shrink-0 mt-0.5" />
              <div>
                You are marking <strong className="font-semibold">{rejectingVendor.vendorName}</strong> ({rejectingVendor.vendorCode}) as <strong>Rejected</strong>.
              </div>
            </div>

            <Textarea
              id="rejectionComments"
              label="Rejection Reason / QA Audit Comments"
              required
              rows={3}
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Specify reasons for rejection (e.g., GST registration mismatch, surface tolerance failed quality inspection)..."
            />

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-border">
              <CancelButton
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setRejectingVendor(null)}
                disabled={actionLoading}
              />
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
