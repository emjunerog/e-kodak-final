import React from 'react';
import PropTypes from 'prop-types';
import {
  CameraOff,
} from 'lucide-react';
import { getStudentsForPage } from '../../../services/yearbookService';

export default function YearbookPageMinimalist({
  pageNumber,
  students = [],
  config = {},
  onSelectStudent,
}) {
  const density = config.layoutDensity || 6;
  const pageStudents = getStudentsForPage(students, pageNumber, density);

  return (
    <div className="h-full w-full bg-white text-neutral-900 flex flex-col justify-between p-7 sm:p-8 font-sans select-none relative overflow-hidden shadow-inner border border-neutral-200">
      
      {/* Running Header */}
      <div className="flex items-center justify-between pb-3 mb-2 text-xs tracking-[0.2em] uppercase font-mono text-neutral-400 border-b border-neutral-100 shrink-0 z-10">
        <span>{config.institutionName || ''}</span>
        <span>{config.sectionName || config.batchName || ''}</span>
      </div>

      {/* Main Student Portfolio with Generous Whitespace */}
      <div className="flex-1 flex flex-col justify-center my-auto z-10">
        {pageStudents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
            {pageStudents.map((stu) => (
              <div
                key={stu.id}
                onClick={() => onSelectStudent?.(stu)}
                className="group cursor-pointer flex flex-col items-start transition-opacity duration-200 hover:opacity-90"
              >
                {/* 2×2 Minimalist Frame */}
                <div className="w-full aspect-square bg-neutral-100 overflow-hidden relative mb-2.5 rounded-xs border border-neutral-200/80 group-hover:border-neutral-900 transition-colors shadow-2xs">
                  {stu.photoUrl ? (
                    <img
                      src={stu.photoUrl}
                      alt={stu.name}
                      className="w-full h-full object-cover filter contrast-[1.05] transition-transform duration-300 group-hover:scale-102"
                      style={{
                        transform: `scale(${stu.photoSpecs?.zoom || 1}) translate(${stu.photoSpecs?.panX || 0}%, ${stu.photoSpecs?.panY || 0}%)`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-neutral-50 text-neutral-400">
                      <CameraOff size={18} className="mb-1 text-neutral-300 stroke-[1.5]" />
                      <span className="text-[9px] font-mono tracking-widest uppercase">
                        UNASSIGNED
                      </span>
                    </div>
                  )}

                  {stu.isOfficer && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-neutral-900 text-white text-[9px] font-mono uppercase tracking-wider">
                      {stu.role || 'LEADER'}
                    </span>
                  )}
                </div>

                {/* Candidate Name */}
                <h4 className="font-semibold text-xs text-neutral-900 truncate w-full tracking-tight">
                  {stu.name}
                </h4>

                {/* Student ID / Program — only when provided */}
                {(stu.studentId || stu.degree) && (
                  <p className="text-[11px] text-neutral-400 font-mono tracking-wide truncate w-full mt-0.5">
                    {stu.studentId ? `№ ${stu.studentId}` : stu.degree}
                  </p>
                )}

                {/* Motto */}
                {config.showQuotes !== false && stu.motto && (
                  <p className="mt-1 text-[11px] text-neutral-500 italic line-clamp-2 leading-relaxed">
                    &ldquo;{stu.motto}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 rounded-xs border border-neutral-100">
            <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
              No records on this page
            </p>
          </div>
        )}
      </div>

      {/* Running Footer */}
      <div className="flex items-center justify-between pt-3 mt-2 text-xs tracking-[0.2em] font-mono text-neutral-400 border-t border-neutral-100 shrink-0 z-10">
        <span>{config.academicYear || ''}</span>
        <span className="font-bold text-neutral-900">{pageNumber}</span>
      </div>
    </div>
  );
}

YearbookPageMinimalist.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
