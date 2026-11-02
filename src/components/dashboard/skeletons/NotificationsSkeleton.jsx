import React from 'react';

export default function NotificationsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse select-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex items-start gap-4"
        >
          {/* Avatar Icon */}
          <div className="w-10 h-10 rounded-2xl bg-neutral-200 dark:bg-neutral-800 shrink-0 mt-0.5" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-40 sm:w-56 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
            <div className="h-3.5 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
            <div className="h-3.5 w-4/5 rounded bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

