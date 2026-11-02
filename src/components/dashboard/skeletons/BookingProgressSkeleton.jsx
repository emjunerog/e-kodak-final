import React from 'react';

export default function BookingProgressSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col font-body pb-6 select-none animate-pulse">
      {/* ── Hero Banner Skeleton ────────────────────────────────────────── */}
      <div className="w-full relative overflow-hidden bg-neutral-900 rounded-b-3xl sm:rounded-b-[40px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="h-5 w-32 rounded-full bg-neutral-800" />
            <div className="h-9 sm:h-11 w-72 sm:w-96 rounded-2xl bg-neutral-800" />
            <div className="h-4 w-52 rounded-xl bg-neutral-800/80" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 rounded-2xl bg-neutral-800" />
            <div className="h-10 w-40 rounded-2xl bg-neutral-800/90" />
          </div>
        </div>
      </div>

      {/* ── Main Pipeline Container ─────────────────────────────────────── */}
      <div className="w-full flex-1 flex flex-col px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        {/* Active Booking Tracker Card */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-xs space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded-full bg-amber-500/20" />
                <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <div className="h-8 w-64 sm:w-80 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="h-10 w-36 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          </div>

          {/* Stepper Progress Nodes */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2.5 text-center">
                <div className="w-10 h-10 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
            ))}
          </div>

          {/* Details & Actions Footer */}
          <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-28 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-9 w-32 rounded-xl bg-amber-500/20" />
            </div>
          </div>
        </div>

        {/* Studio Specs & Inclusions Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4 shadow-xs">
            <div className="h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4 shadow-xs">
            <div className="h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

