import React from 'react';

export default function PaymentsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Policy Card Skeleton */}
      <div className="rounded-2xl p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-64 rounded bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        </div>
        <div className="h-6 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
      </div>

      {/* Invoice Cards List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded-full bg-amber-500/20" />
                <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <div className="h-6 w-56 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-40 rounded bg-neutral-100 dark:bg-neutral-800/60" />
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right space-y-1">
                <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800 ml-auto" />
                <div className="h-7 w-28 rounded-lg bg-neutral-200 dark:bg-neutral-800 ml-auto" />
              </div>
              <div className="h-10 w-28 rounded-xl bg-amber-500/20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

