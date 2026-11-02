import React from 'react';

export default function ActivityTrailSkeleton() {
  return (
    <div className="rounded-[24px] bg-white dark:bg-[#12131a] border border-neutral-200/80 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4 animate-pulse select-none">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="h-5 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-20 rounded bg-neutral-100 dark:bg-neutral-800/60" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] flex items-start gap-3.5"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="h-3 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

