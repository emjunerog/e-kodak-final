import React from 'react';
import PropTypes from 'prop-types';
import {
  CameraOff,
  ArrowUpRight,
} from 'lucide-react';
import { getStudentsForPage } from '../../../services/yearbookService';

export default function YearbookPageModernEditorial({
  pageNumber,
  students = [],
  config = {},
  onSelectStudent,
}) {
  const density = config.layoutDensity || 6;
  const pageStudents = getStudentsForPage(students, pageNumber, density);
  const startIndex = (Math.max(1, pageNumber) - 1) * density;

  return (
    <div className="h-full w-full bg-[#f6f6f4] text-neutral-900 flex flex-col justify-between p-6 sm:p-7 font-sans select-none relative overflow-hidden shadow-inner border border-neutral-300">
      
      {/* Header */}
      <div className="border-b-2 border-neutral-900 pb-2 mb-3 flex items-end justify-between shrink-0 z-10">
        <div>
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-neutral-500 block">
            {config.institutionName || ''}
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-black tracking-tight text-neutral-950 uppercase leading-none mt-1">
            {config.sectionName || config.batchName || ''}
          </h2>
        </div>
        <div className="text-right">
          {config.academicYear && (
            <span className="text-xs font-mono font-bold text-neutral-700">
              {config.academicYear}
            </span>
          )}
          <span className="text-[11px] text-neutral-400 block font-mono">
            {pageNumber}
          </span>
        </div>
      </div>

      {/* Editorial Asymmetrical & Clean Grid */}
      <div className="flex-1 flex flex-col justify-center my-auto z-10">
        {pageStudents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {pageStudents.map((stu, idx) => (
              <div
                key={stu.id}
                onClick={() => onSelectStudent?.(stu)}
                className="group cursor-pointer flex flex-col bg-white p-2.5 rounded-sm border border-neutral-200/90 hover:border-neutral-900 hover:shadow-xl transition-all duration-300 relative"
              >
                {/* Photo with Editorial Hairline Border */}
                <div className="w-full aspect-[4/5] bg-neutral-950 overflow-hidden relative mb-2 shadow-2xs">
                  {stu.photoUrl ? (
                    <img
                      src={stu.photoUrl}
                      alt={stu.name}
                      className="w-full h-full object-cover filter grayscale contrast-110 group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                      style={{
                        transform: `scale(${stu.photoSpecs?.zoom || 1}) translate(${stu.photoSpecs?.panX || 0}%, ${stu.photoSpecs?.panY || 0}%)`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-neutral-900 text-neutral-400">
                      <CameraOff size={20} className="mb-1 text-neutral-500" />
                      <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                        NO PHOTO
                      </span>
                    </div>
                  )}

                  {/* Corner Index Tag */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-neutral-950/80 text-white text-[10px] font-mono">
                    #{startIndex + idx + 1}
                  </div>

                  {stu.isOfficer && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-neutral-900 text-amber-300 text-[9px] font-mono font-bold tracking-wider uppercase border border-amber-400/40">
                      {stu.role || 'LEAD'}
                    </div>
                  )}
                </div>

                {/* Name & Credentials — only when provided */}
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-neutral-950 truncate group-hover:text-amber-700 transition-colors">
                      {stu.name}
                    </h4>
                    {(stu.degree || stu.credentials || stu.studentId) && (
                      <p className="text-[11px] text-neutral-500 font-mono tracking-wide truncate">
                        {stu.degree || stu.credentials || `ID: ${stu.studentId}`}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>

                {/* Quote as elegant pull quote */}
                {config.showQuotes !== false && stu.motto && (
                  <p className="mt-1.5 pt-1.5 border-t border-neutral-100 text-[11px] text-neutral-600 font-serif italic line-clamp-2 leading-relaxed">
                    &ldquo;{stu.motto}&rdquo;
                  </p>
                )}

                {/* Honors Label */}
                {config.showHonors !== false && stu.honors && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-800 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="truncate">{stu.honors}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 rounded-sm border border-dashed border-neutral-300 bg-white">
            <p className="font-serif text-sm font-bold text-neutral-800">
              No records on this page
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-300 pt-2 mt-3 flex items-center justify-between text-xs font-mono text-neutral-500 shrink-0 z-10">
        <span>{config.sectionName || config.batchName || ''}</span>
        <span className="font-serif font-bold text-neutral-900 text-xs">
          {pageNumber}
        </span>
      </div>
    </div>
  );
}

YearbookPageModernEditorial.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
