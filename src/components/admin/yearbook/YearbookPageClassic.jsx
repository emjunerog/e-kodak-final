import React from 'react';
import PropTypes from 'prop-types';
import {
  Award,
  GraduationCap,
  CameraOff,
} from 'lucide-react';
import { getStudentsForPage } from '../../../services/yearbookService';

export default function YearbookPageClassic({
  pageNumber,
  students = [],
  config = {},
  onSelectStudent,
}) {
  const density = config.layoutDensity || 6;
  const photoCut = config.photoCut || '2x2';
  const photoTone = config.photoTone || 'natural';

  // Single source of truth for pagination (shared with PDF export)
  const pageStudents = getStudentsForPage(students, pageNumber, density);

  // Dynamic grid classes based on density
  const gridClasses = {
    4: 'grid-cols-2 gap-4 sm:gap-5',
    6: 'grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4',
    8: 'grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3',
    9: 'grid-cols-3 gap-2.5 sm:gap-3',
    12: 'grid-cols-3 sm:grid-cols-4 gap-2',
  }[density] || 'grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4';

  // Frame cut styling
  const frameClasses = {
    '2x2': 'aspect-square rounded-lg',
    '2x3': 'aspect-[2/3] rounded-lg',
    'oval': 'aspect-[3/4] rounded-full',
  }[photoCut] || 'aspect-square rounded-lg';

  // Tone filter styling
  const filterStyle = {
    natural: '',
    bw: 'filter grayscale contrast-115',
    sepia: 'filter sepia-[0.35] contrast-105',
  }[photoTone] || '';

  return (
    <div
      className="h-full w-full bg-[#fdfbf7] text-neutral-800 flex flex-col justify-between p-5 sm:p-6 font-serif select-none relative overflow-hidden shadow-inner border border-neutral-300"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.95), #f7f1e5)',
      }}
    >
      {/* Header */}
      <div className="border-b border-amber-900/15 pb-2 mb-3 flex items-center justify-between text-xs shrink-0 z-10">
        <div>
          <span className="font-heading font-bold text-neutral-900 uppercase tracking-widest text-[11px]">
            {config.institutionName || ''}
          </span>
          {(config.sectionName || config.batchName) && (
            <span className="text-neutral-500 font-sans text-xs ml-2">
              · {config.sectionName || config.batchName}
            </span>
          )}
        </div>
        {config.academicYear && (
          <span className="text-amber-800 font-mono text-xs tracking-wider font-semibold">
            {config.academicYear}
          </span>
        )}
      </div>

      {/* Main Student Grid Area */}
      <div className="flex-1 flex flex-col justify-center my-auto z-10">
        {pageStudents.length > 0 ? (
          <div className={`grid ${gridClasses}`}>
            {pageStudents.map((stu) => (
              <div
                key={stu.id}
                onClick={() => onSelectStudent?.(stu)}
                className="group cursor-pointer flex flex-col items-center bg-white/90 p-2 sm:p-2.5 rounded-xl border border-amber-900/10 hover:border-amber-500 hover:shadow-lg transition-all duration-200 relative text-center"
              >
                {/* 2×2 / Portrait Photo Frame */}
                <div
                  className={`w-full max-w-[120px] ${frameClasses} bg-neutral-900 overflow-hidden ring-2 ring-amber-400/40 group-hover:ring-amber-500 relative mb-2 shadow-xs`}
                >
                  {stu.photoUrl ? (
                    <img
                      src={stu.photoUrl}
                      alt={stu.name}
                      className={`w-full h-full object-cover ${filterStyle} transition-transform duration-300 group-hover:scale-105`}
                      style={{
                        transform: `scale(${stu.photoSpecs?.zoom || 1}) translate(${stu.photoSpecs?.panX || 0}%, ${stu.photoSpecs?.panY || 0}%)`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-neutral-800 text-amber-200/80">
                      <CameraOff size={20} className="mb-1 text-amber-400/60" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                        NO PHOTO ON FILE
                      </span>
                    </div>
                  )}

                  {/* Officer Badge — only when explicitly assigned */}
                  {stu.isOfficer && (
                    <div className="absolute top-0 inset-x-0 bg-amber-500 text-neutral-950 text-[9px] font-bold uppercase text-center py-0.5 shadow-xs">
                      {stu.role || 'Class Officer'}
                    </div>
                  )}
                </div>

                {/* Student Full Name */}
                <h4 className="font-heading font-bold text-xs sm:text-sm text-neutral-900 truncate w-full group-hover:text-amber-800 transition-colors">
                  {stu.name}
                </h4>

                {/* Nickname / Student ID — only when provided */}
                {(stu.studentId || stu.nickname) && (
                  <p className="text-xs text-neutral-500 font-mono truncate w-full">
                    {stu.studentId ? `ID: ${stu.studentId}` : `"${stu.nickname}"`}
                  </p>
                )}

                {/* Honors or Degree */}
                {config.showHonors !== false && stu.honors && (
                  <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[10px] font-sans font-bold border border-amber-300/60 truncate max-w-full">
                    <Award size={9} />
                    <span className="truncate">{stu.honors}</span>
                  </div>
                )}

                {/* Senior Motto / Quotation */}
                {config.showQuotes !== false && stu.motto && (
                  <p className="mt-1 text-[11px] text-neutral-600 italic line-clamp-2 leading-tight px-1 font-serif">
                    &ldquo;{stu.motto}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-amber-900/20 bg-amber-50/30">
            <GraduationCap size={32} className="mx-auto text-amber-700/50 mb-2" />
            <p className="text-xs font-semibold text-neutral-700">
              No records on this page
            </p>
          </div>
        )}
      </div>

      {/* Footer with Page Number */}
      <div className="border-t border-amber-900/15 pt-2 mt-3 flex items-center justify-between text-xs text-neutral-500 font-mono shrink-0 z-10">
        <span>{config.sectionName || config.batchName || ''}</span>
        <span className="font-bold text-neutral-800 font-sans">
          {pageNumber}
        </span>
      </div>
    </div>
  );
}

YearbookPageClassic.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
