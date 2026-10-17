import React from 'react';
import PropTypes from 'prop-types';
import {
  YearbookHardcoverFront,
  YearbookInsideDedication,
  YearbookHardcoverBack,
} from './YearbookCover';
import YearbookSectionOpener from './YearbookSectionOpener';
import YearbookPageClassic from './YearbookPageClassic';
import YearbookPageModernEditorial from './YearbookPageModernEditorial';
import YearbookPageMinimalist from './YearbookPageMinimalist';
import YearbookPageDoodle from './YearbookPageDoodle';
import YearbookPageChalkboard from './YearbookPageChalkboard';
import { getStudentPageCount } from '../../../services/yearbookService';

/**
 * YearbookPrintBook
 * Linear, one-sheet-per-page rendering for A4 bond paper (210 × 297 mm).
 * Screen: stacked A4-ratio sheets with labels.
 * Print (@media print): each .yb-print-page becomes one A4 sheet.
 * Order: cover → school message → directory → student pages → back cover.
 */

export default function YearbookPrintBook({ students = [], config = {}, theme = 'classic' }) {
  const density = config.layoutDensity || 6;
  const interiorCount = getStudentPageCount(students.length, density);

  const renderInteriorPage = (pageNumber) => {
    const props = { pageNumber, students, config };
    switch (theme) {
      case 'editorial':
      case 'modern':
        return <YearbookPageModernEditorial {...props} />;
      case 'minimalist':
        return <YearbookPageMinimalist {...props} />;
      case 'scrapbook':
      case 'doodle':
        return <YearbookPageDoodle {...props} />;
      case 'chalkboard':
      case 'contemporary':
        return <YearbookPageChalkboard {...props} />;
      case 'classic':
      default:
        return <YearbookPageClassic {...props} />;
    }
  };

  const interiorPages = Array.from({ length: interiorCount }, (_, i) => i + 1);

  return (
    <div id="yearbook-print-book" className="yb-print-book space-y-4">
      {/* Sheet 1: Front cover */}
      <div className="yb-print-page" data-page="cover">
        <div className="yb-screen-label">Sheet 1 · Front Cover (A4)</div>
        <div className="yb-sheet">
          <YearbookHardcoverFront config={config} students={students} />
        </div>
      </div>

      {/* Sheet 2: School message */}
      <div className="yb-print-page" data-page="message">
        <div className="yb-screen-label">Sheet 2 · School Message (A4)</div>
        <div className="yb-sheet">
          <YearbookInsideDedication config={config} students={students} />
        </div>
      </div>

      {/* Sheet 3: Class directory */}
      <div className="yb-print-page" data-page="directory">
        <div className="yb-screen-label">Sheet 3 · Class Directory (A4)</div>
        <div className="yb-sheet">
          <YearbookSectionOpener students={students} config={config} />
        </div>
      </div>

      {/* Interior student pages */}
      {interiorPages.map((pageNumber) => (
        <div className="yb-print-page" data-page={`interior-${pageNumber}`} key={pageNumber}>
          <div className="yb-screen-label">Sheet {pageNumber + 3} · Students Page {pageNumber} of {interiorCount} (A4)</div>
          <div className="yb-sheet">
            {renderInteriorPage(pageNumber)}
          </div>
        </div>
      ))}

      {/* Final sheet: Back cover */}
      <div className="yb-print-page" data-page="back">
        <div className="yb-screen-label">Sheet {interiorCount + 4} · Back Cover (A4)</div>
        <div className="yb-sheet">
          <YearbookHardcoverBack
            config={config}
            students={students}
            studentCount={students.length}
            pageCount={interiorCount}
          />
        </div>
      </div>
    </div>
  );
}

YearbookPrintBook.propTypes = {
  students: PropTypes.array,
  config: PropTypes.object,
  theme: PropTypes.string,
};
