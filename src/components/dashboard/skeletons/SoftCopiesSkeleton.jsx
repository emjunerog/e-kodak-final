import React from 'react';

export default function SoftCopiesSkeleton() {
  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-pulse select-none">
      {/* Category Filter Pills Skeleton */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-28 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          ))}
        </div>
        <div className="h-9 w-36 rounded-xl bg-amber-500/20 shrink-0" />
      </div>

      {/* Grid of Soft-copy Photo Outputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col"
          >
            {/* Image Placeholder */}
            <div
              className={`w-full bg-neutral-200 dark:bg-neutral-800 ${
                i % 3 === 0 ? 'aspect-square' : 'aspect-[3/4]'
              }`}
            />
            {/* Metadata Footer */}
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-12 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

