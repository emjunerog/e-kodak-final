import React from 'react';
import PropTypes from 'prop-types';
import {
  GraduationCap,
} from 'lucide-react';
import { getStudentsForPage } from '../../../services/yearbookService';

export default function YearbookPageChalkboard({
  pageNumber,
  students = [],
  config = {},
  onSelectStudent,
}) {
  const density = config.layoutDensity || 6;
  const pageStudents = getStudentsForPage(students, pageNumber, density);
  const sectionLabel = config.sectionName || config.batchName || '';
  const schoolLabel = config.institutionName || '';

  return (
    <div className="h-full w-full bg-[#18232e] text-white flex flex-col justify-between p-4 sm:p-5 font-body select-none relative overflow-hidden border-4 border-[#2b3a47] shadow-2xl">

      {/* Chalkboard Slate Texture Overlay */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Decorative Chalk Doodles (Books, Compass, Mortarboard, Globe) */}
      <div className="absolute top-2 left-3 text-cyan-200/40 pointer-events-none text-xs font-mono">
        ✎ 📐 ✈
      </div>
      <div className="absolute top-2 right-3 text-yellow-200/40 pointer-events-none text-xs font-mono">
        🎓 🔬 ★
      </div>

      {/* Header */}
      <div className="text-center mb-2 z-10 shrink-0">
        <div className="inline-block relative">
          {/* Hand-drawn styled banner */}
          <div className="border-2 border-dashed border-white/60 px-6 py-1 rounded-full bg-white/5 backdrop-blur-xs">
            <h2 className="font-heading text-base sm:text-lg font-bold tracking-widest text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {sectionLabel}
            </h2>
          </div>
          {schoolLabel && (
            <span className="block text-xs text-cyan-300 font-mono tracking-wider mt-0.5">
              {schoolLabel}
            </span>
          )}
        </div>
      </div>

      {/* Center Layout: Student Frames */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden z-10">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {pageStudents.map((stu, i) => (
            <div
              key={stu.id || i}
              onClick={() => onSelectStudent?.(stu)}
              className="group cursor-pointer flex flex-col items-center bg-[#131b24]/80 p-1.5 rounded-lg border-2 border-white/40 hover:border-yellow-300 transition-all duration-200 shadow-lg"
            >
              {/* Photo Frame with double border */}
              <div className="w-full aspect-[3/4] bg-neutral-900 rounded overflow-hidden relative border border-white/30 mb-1">
                {stu.photoUrl ? (
                  <img
                    src={stu.photoUrl}
                    alt={stu.name}
                    className="w-full h-full object-cover object-top filter grayscale contrast-115 group-hover:grayscale-0 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-neutral-950 text-cyan-200/60 font-mono text-[9px]">
                    <span>✎ NO PHOTO</span>
                  </div>
                )}
                {stu.isOfficer && stu.role && (
                  <div className="absolute top-0 inset-x-0 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-wider text-center py-0.5">
                    {stu.role.replace('Class ', '')}
                  </div>
                )}
              </div>

              {/* Name & motto — only when provided */}
              <div className="text-center w-full min-w-0">
                <p className="text-xs font-bold text-white truncate font-mono">
                  {stu.name}
                </p>
                {stu.motto && (
                  <p className="text-[10px] text-cyan-200/90 italic truncate font-serif">
                    &ldquo;{stu.motto}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-mono text-neutral-400 z-10 shrink-0">
        <span className="flex items-center gap-1 text-yellow-300">
          <GraduationCap size={12} />
          <span>{sectionLabel}</span>
        </span>
        <span className="text-white font-bold">
          {pageNumber}
        </span>
      </div>

    </div>
  );
}

YearbookPageChalkboard.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
