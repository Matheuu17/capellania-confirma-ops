import { Package, Layers } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center pt-20 px-4">
      {/* Skeleton del Topbar implicito por el layout */}
      <div className="w-full max-w-6xl space-y-6 animate-pulse">
        
        {/* Toolbar Skeleton */}
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200/80 rounded-md"></div>
            <div className="h-4 w-64 bg-slate-200/50 rounded-md"></div>
          </div>
          <div className="h-9 w-32 bg-slate-200/80 rounded-lg"></div>
        </div>

        {/* Data Grid Skeleton */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="hidden md:block h-11 bg-slate-50/70 border-b border-slate-100"></div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-center px-6 py-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-100 rounded-md"></div>
                  <div className="h-3 w-1/4 bg-slate-50 rounded-md"></div>
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}