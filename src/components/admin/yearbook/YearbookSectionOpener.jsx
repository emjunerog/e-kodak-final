import React from 'react';
import PropTypes from 'prop-types';
import { detectCampuses, detectSections, detectSchools } from '../../../services/yearbookService';

/**
 * Section divider sheet — photos only, no stats, no labels, no tags.
 * Shows the school / campus / section detected from the records plus a
 * creative strip of student photos.
 */
export default function YearbookSectionOpener({
  students = [],
  config = {},
  onSelectStudent,
}) {
  const school = (config.institutionName || '').trim()
    || (config.targetSchool || '').trim()
    || detectSchools(students)[0]?.name
    || '';
  const campuses = detectCampuses(students);
  const campusLine = campuses.length > 0
    ? campuses.join(' · ')
    : (config.campus || '').trim();
  const sections = detectSections(students);
  const sectionLine = sections.length > 0
    ? sections.join(' · ')
    : (config.sectionName || config.batchName || '').trim();
  const year = (config.academicYear || '').trim();
  const strip = students.filter((s) => s.photoUrl).slice(0, 7);

  return (
    <div className="h-full w-full bg-[#fbf9f3] text-neutral-800 flex flex-col p-8 sm:p-12 font-serif select-none relative overflow-hidden">
      {/* Hairline frame */}
      <div className="absolute inset-4 border border-neutral-900/10 pointer-events-none" />

      {/* Center */}
      <div className="relative z-10 my-auto text-center">
        {school && (
          <p className="text-xs tracking-[0.3em] uppercase font-semibold text-neutral-800 font-sans">
            {school}
          </p>
        )}

        {sectionLine && (
          <h1 className="mt-4 font-serif font-medium uppercase leading-snug tracking-[0.1em] text-2xl sm:text-3xl lg:text-4xl text-neutral-900">
            {sectionLine}
          </h1>
        )}

        {(campusLine || year) && (
          <p className="mt-3 text-[11px] sm:text-xs tracking-[0.25em] uppercase text-neutral-500 font-sans">
            {[campusLine, year].filter(Boolean).join('   ·   ')}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 my-6">
          <div className="h-px w-14 bg-neutral-900/20" />
          <div className="h-1.5 w-1.5 rotate-45 border border-neutral-900/30" />
          <div className="h-px w-14 bg-neutral-900/20" />
        </div>

        {/* Creative photo strip — photos only */}
        {strip.length > 0 && (
          <div className="flex items-center justify-center">
            {strip.map((stu, i) => (
              <button
                key={stu.id || i}
                type="button"
                onClick={() => onSelectStudent?.(stu)}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden ring-2 ring-white shadow-md cursor-pointer transition-transform hover:scale-110 -ml-3 first:ml-0"
                title={stu.name}
              >
                <img
                  src={stu.photoUrl}
                  alt={stu.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

YearbookSectionOpener.propTypes = {
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
