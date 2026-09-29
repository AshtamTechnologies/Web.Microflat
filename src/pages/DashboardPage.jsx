/**
 * DashboardPage — placeholder.
 * Layout chrome (sidebar, top bar) is handled by AppLayout.
 * Replace with real dashboard content in a future task.
 */

import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
        <LayoutDashboard size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-heading">Dashboard</h2>
        <p className="text-text-muted text-sm mt-1 max-w-xs">
          Dashboard content will be built in the next sprint.
        </p>
      </div>
    </div>
  );
}
