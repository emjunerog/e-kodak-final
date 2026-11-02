import React from 'react';

export default function BookingDetailsSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col font-body pb-6 select-none animate-pulse">
      {/* ── Hero Banner Skeleton ────────────────────────────────────────── */}
      <div className="w-full relative overflow-hidden bg-neutral-900 rounded-b-3xl sm:rounded-b-[40px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="h-5 w-28 rounded-full bg-neutral-800" />
            <div className="h-9 sm:h-11 w-72 sm:w-80 rounded-2xl bg-neutral-800" />
            <div className="h-4 w-48 rounded-xl bg-neutral-800/80" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-28 rounded-2xl bg-neutral-800" />
            <div className="h-10 w-36 rounded-2xl bg-neutral-800/90" />
          </div>
        </div>
      </div>

      {/* ── Main Container ──────────────────────────────────────────────── */}
      <div className="w-full flex-1 flex flex-col px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        {/* Booking selector tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-36 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          ))}
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-2 shadow-xs"
            >
              <div className="h-3.5 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-6 w-32 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>

        {/* 2-Column Booking Inspector */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Details (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-7 w-24 rounded-full bg-amber-500/20" />
              </div>

              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
                <div className="h-4 w-5/6 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                <div className="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40" />
                <div className="h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40" />
              </div>
            </div>
          </div>

          {/* Right QR Pass & Quick Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col items-center text-center space-y-4">
              <div className="w-44 h-44 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-5 w-32 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-48 rounded bg-neutral-100 dark:bg-neutral-800/60" />
              <div className="h-10 w-full rounded-xl bg-amber-500/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

