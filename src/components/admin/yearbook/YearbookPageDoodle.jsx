import React from 'react';
import PropTypes from 'prop-types';
import {
  Zap,
} from 'lucide-react';
import { getStudentsForPage } from '../../../services/yearbookService';

export default function YearbookPageDoodle({
  pageNumber,
  students = [],
  config = {},
  onSelectStudent,
}) {
  const density = config.layoutDensity || 6;
  // Same pagination as every other template so print output matches preview
  const displayStudents = getStudentsForPage(students, pageNumber, density);
  const sectionLabel = config.sectionName || config.batchName || '';

  return (
    <div className="h-full w-full bg-[#050b18] text-white flex flex-col justify-between p-4 sm:p-5 font-body select-none relative overflow-hidden border border-cyan-500/30 shadow-2xl">

      {/* Background Chalk Noise & Neon Grid Lines */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Floating Neon Doodles Background Decorative elements */}
      <div className="absolute top-2 left-6 text-yellow-400 font-mono text-sm opacity-60 pointer-events-none">
        ★ ⚡ ♫
      </div>
      <div className="absolute top-3 right-8 text-pink-400 font-mono text-sm opacity-60 pointer-events-none">
        ♡ 🍒 ✿
      </div>

      {/* Header */}
      <div className="text-center mb-3 z-10 shrink-0">
        <div className="inline-flex items-center gap-3">
          <h1 className="font-heading text-xl sm:text-2xl font-black tracking-widest text-white drop-shadow-[0_2px_10px_rgba(56,189,248,0.5)]">
            {sectionLabel}
          </h1>
          {config.academicYear && (
            <span className="text-xs sm:text-sm font-mono text-yellow-300 font-bold tracking-wider">
              ({config.academicYear})
            </span>
          )}
        </div>
      </div>

      {/* Roster Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide z-10">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
          {displayStudents.map((stu, i) => {
            const isOfficer = stu.isOfficer;

            return (
              <div
                key={stu.id || i}
                onClick={() => onSelectStudent?.(stu)}
                className={`relative group cursor-pointer flex flex-col items-center text-center p-1 rounded-lg transition-transform hover:scale-105 ${isOfficer ? 'col-span-1 bg-cyan-950/30 border border-cyan-500/40' : 'bg-black/30'
                  }`}
              >
                {/* Name */}
                <div className="mb-0.5 text-center min-w-0 w-full px-0.5">
                  <span className="text-xs font-bold text-white tracking-wide block truncate font-mono">
                    {stu.nickname || stu.name.split(' ')[0]}
                  </span>
                  {stu.isOfficer && stu.role && (
                    <span className="text-[10px] font-extrabold uppercase text-yellow-300 block truncate">
                      {stu.role.replace('Class ', '')}
                    </span>
                  )}
                </div>

                {/* Photo Container */}
                <div className="relative w-full aspect-[4/5] rounded bg-neutral-900 overflow-hidden ring-1 ring-cyan-400/40 shadow-md">
                  {stu.photoUrl ? (
                    <img
                      src={stu.photoUrl}
                      alt={stu.name}
                      className="w-full h-full object-cover object-top filter contrast-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-neutral-950 text-cyan-400/60 font-mono text-[9px]">
                      <span>NO PHOTO</span>
                    </div>
                  )}
                </div>

                {/* Caption — motto only, when provided */}
                {stu.motto && (
                  <div className="mt-1 w-full min-w-0">
                    <p className="text-[10px] font-serif italic text-cyan-200/90 leading-tight line-clamp-2">
                      &ldquo;{stu.motto}&rdquo;
                    </p>
                  </div>
                )}

                {/* Neon Squiggle Accents */}
                <span className="absolute -top-1 -right-1 text-xs text-yellow-300 opacity-80 group-hover:rotate-45 transition-transform">
                  ✦
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2.5 pt-2 border-t border-cyan-900/60 flex items-center justify-between text-xs text-neutral-400 z-10 shrink-0 font-mono">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Zap size={12} className="text-yellow-400" />
          <span>{sectionLabel}</span>
        </div>
        <div className="text-pink-400 font-bold">
          {pageNumber}
        </div>
      </div>

    </div>
  );
}

YearbookPageDoodle.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
