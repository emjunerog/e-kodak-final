import React from 'react';

export default function DashboardHomeSkeleton() {
  return (
    <div className="w-full pb-16 font-body select-none">
      {/* ── 1. Hero Banner Skeleton ───────────────────────────────────────── */}
      <div className="w-full relative overflow-hidden bg-neutral-900 rounded-b-3xl sm:rounded-b-[40px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-b border-neutral-800 animate-pulse">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 rounded-full bg-neutral-800" />
              <div className="h-5 w-32 rounded-full bg-neutral-800/60" />
            </div>
            <div className="h-8 sm:h-10 w-64 sm:w-80 rounded-2xl bg-neutral-800" />
            <div className="h-4 w-48 sm:w-60 rounded-xl bg-neutral-800/80" />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-28 rounded-2xl bg-neutral-800" />
            <div className="h-10 w-36 rounded-2xl bg-neutral-800/90" />
          </div>
        </div>
      </div>

      {/* ── 2. Grid Container ─────────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* ── Main Column (8 cols) ───────────────────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full min-w-0">
            {/* Order Tracker Card Skeleton */}
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-7 shadow-xs space-y-6 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-28 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-5 w-20 rounded-full bg-amber-500/20" />
                  </div>
                  <div className="h-6 w-56 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="h-9 w-32 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              </div>

              {/* Step Progress Rail Skeleton */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                ))}
              </div>

              {/* Meta Detail Row Skeleton */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="h-8 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>

            {/* Quick Actions (4 cards) Skeleton */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-4 shadow-xs space-y-3 animate-pulse"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15" />
                  <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-32 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                </div>
              ))}
            </div>

            {/* Studio Experience Banner Skeleton */}
            <div className="h-40 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 flex items-center justify-between shadow-xs animate-pulse">
              <div className="space-y-2.5 max-w-md">
                <div className="h-4 w-24 rounded-full bg-amber-500/20" />
                <div className="h-6 w-60 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-72 rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 shrink-0 hidden sm:block" />
            </div>

            {/* Session Credentials Card Skeleton */}
            <div className="min-h-[280px] rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-7 w-28 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="h-32 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50" />
                <div className="h-32 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50" />
              </div>
            </div>
          </div>

          {/* ── Side Column (4 cols) ───────────────────────────────────────── */}
          <aside className="lg:col-span-4 flex flex-col gap-6 h-full min-w-0">
            {/* Upcoming Dates Card Skeleton */}
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="w-7 h-7 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/40 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-3 w-36 rounded bg-neutral-100 dark:bg-neutral-800/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lookbook App Reminder Card Skeleton */}
            <div className="flex-1 min-h-[300px] rounded-[32px] bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-28 rounded-full bg-emerald-500/20" />
                <div className="h-4 w-16 rounded bg-amber-500/20" />
              </div>

              {/* Fanned portrait placeholders */}
              <div className="py-4 flex items-center justify-center -space-x-4">
                <div className="w-20 h-28 rounded-xl bg-neutral-200 dark:bg-neutral-800 border-2 border-white dark:border-neutral-900 -rotate-6" />
                <div className="w-24 h-36 rounded-2xl bg-neutral-300 dark:bg-neutral-700 border-2 border-white dark:border-neutral-900 z-10" />
                <div className="w-20 h-28 rounded-xl bg-neutral-200 dark:bg-neutral-800 border-2 border-white dark:border-neutral-900 rotate-6" />
              </div>

              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-amber-500/20" />
                <div className="h-5 w-44 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>

              <div className="h-9 w-36 rounded-xl bg-neutral-200 dark:bg-neutral-800 mt-3" />
            </div>

            {/* App Install Card Skeleton */}
            <div className="h-72 rounded-[32px] bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-3.5 w-28 rounded bg-amber-500/20" />
                <div className="h-6 w-48 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="h-28 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50" />
              <div className="h-10 w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

