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
import YearbookPageCustom from './YearbookPageCustom';
import YearbookInstitutionalSheet from './YearbookInstitutionalSheet';
import {
  getStudentPageCount,
  getActiveInstitutionalSections,
} from '../../../services/yearbookService';

/**
 * YearbookPrintBook
 * Linear, one-sheet-per-page rendering for A4 bond paper (210 × 297 mm).
 * Screen: stacked A4-ratio sheets with labels.
 * Print (@media print): each .yb-print-page becomes one A4 sheet.
 * Order: cover → school message → directory → student pages → back cover.
 */

export default function YearbookPrintBook({ students = [], config = {}, theme = 'classic', onSelectStudent }) {
  const density = config.layoutDensity || 6;
  const interiorCount = getStudentPageCount(students.length, density);

  const renderInteriorPage = (pageNumber) => {
    const props = { pageNumber, students, config, onSelectStudent };
    switch (theme) {
      case 'custom':
        return <YearbookPageCustom {...props} />;
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
  const isCustomTheme = theme === 'custom';
  const customTpl = config.customTemplate || {};
  const activeInstitutionalSections = isCustomTheme
    ? getActiveInstitutionalSections(customTpl)
    : [];
  const coverBgUrl = (config.coverBgUrl || '').trim();
  const titlePageBgUrl = (customTpl.titlePageBgUrl || '').trim();
  const dedicationBgUrl = (customTpl.dedicationBgUrl || '').trim();
  const facultyBgUrl = (customTpl.facultyBgUrl || '').trim();
  const openerBgUrl = (customTpl.openerBgUrl || '').trim();
  const officersBgUrl = (customTpl.officersBgUrl || '').trim();
  const memoriesBgUrl = (customTpl.memoriesBgUrl || '').trim();
  const backCoverBgUrl = (customTpl.backCoverBgUrl || '').trim();

  const renderArtworkSheet = (label, bgUrl) => (
    <div className="h-full w-full bg-white relative overflow-hidden">
      <img src={bgUrl} alt={label} className="w-full h-full object-cover" />
    </div>
  );

  return (
    <div id="yearbook-print-book" className="yb-print-book space-y-4">
      {/* Front cover */}
      {(!isCustomTheme || coverBgUrl) && (
        <div className="yb-print-page" data-page="cover">
          <div className="yb-screen-label">Front Cover (A4)</div>
          <div className="yb-sheet">
            {isCustomTheme ? renderArtworkSheet('Front Cover', coverBgUrl) : (
              <YearbookHardcoverFront config={config} students={students} />
            )}
          </div>
        </div>
      )}

      {/* Title & Institutional Pages (VMGO, Programme, Official Messages) */}
      {isCustomTheme && activeInstitutionalSections.length > 0 ? (
        activeInstitutionalSections.map((sec) => (
          <div className="yb-print-page" data-page={`institutional-${sec.key}`} key={sec.key}>
            <div className="yb-screen-label">{sec.label} (A4)</div>
            <div className="yb-sheet">
              <YearbookInstitutionalSheet
                sectionKey={sec.key}
                bgUrl={titlePageBgUrl}
                data={sec.data}
                tpl={customTpl}
                config={config}
                editable={false}
              />
            </div>
          </div>
        ))
      ) : (
        titlePageBgUrl && (
          <div className="yb-print-page" data-page="title">
            <div className="yb-screen-label">Title &amp; Institutional Seal Page (A4)</div>
            <div className="yb-sheet">{renderArtworkSheet('Title Page', titlePageBgUrl)}</div>
          </div>
        )
      )}

      {/* School message */}
      {(!isCustomTheme || dedicationBgUrl) && (
        <div className="yb-print-page" data-page="message">
          <div className="yb-screen-label">School Message (A4)</div>
          <div className="yb-sheet">
            {isCustomTheme ? renderArtworkSheet('School Message', dedicationBgUrl) : (
              <YearbookInsideDedication config={config} students={students} />
            )}
          </div>
        </div>
      )}

      {/* Optional Faculty & Administration Page */}
      {facultyBgUrl && (
        <div className="yb-print-page" data-page="faculty">
          <div className="yb-screen-label">Faculty &amp; Administration (A4)</div>
          <div className="yb-sheet">{renderArtworkSheet('Faculty & Administration', facultyBgUrl)}</div>
        </div>
      )}

      {/* Class directory / Section opener */}
      {(!isCustomTheme || openerBgUrl) && (
        <div className="yb-print-page" data-page="directory">
          <div className="yb-screen-label">Section Opener (A4)</div>
          <div className="yb-sheet">
            {isCustomTheme ? renderArtworkSheet('Section Opener', openerBgUrl) : (
              <YearbookSectionOpener students={students} config={config} />
            )}
          </div>
        </div>
      )}

      {/* Optional Class Officers Feature */}
      {officersBgUrl && (
        <div className="yb-print-page" data-page="officers">
          <div className="yb-screen-label">Class Officers (A4)</div>
          <div className="yb-sheet">{renderArtworkSheet('Class Officers', officersBgUrl)}</div>
        </div>
      )}

      {/* Interior student pages */}
      {interiorPages.map((pageNumber) => (
        <div className="yb-print-page" data-page={`interior-${pageNumber}`} key={pageNumber}>
          <div className="yb-screen-label">Students Page {pageNumber} of {interiorCount} (A4)</div>
          <div className="yb-sheet">
            {renderInteriorPage(pageNumber)}
          </div>
        </div>
      ))}

      {/* Optional Candid Memories & Batch Highlights */}
      {memoriesBgUrl && (
        <div className="yb-print-page" data-page="memories">
          <div className="yb-screen-label">Memories &amp; Highlights (A4)</div>
          <div className="yb-sheet">{renderArtworkSheet('Candid Memories', memoriesBgUrl)}</div>
        </div>
      )}

      {/* Final sheet: Back cover */}
      {(!isCustomTheme || backCoverBgUrl) && (
        <div className="yb-print-page" data-page="back">
          <div className="yb-screen-label">Back Cover (A4)</div>
          <div className="yb-sheet">
            {isCustomTheme ? renderArtworkSheet('Back Cover', backCoverBgUrl) : (
              <YearbookHardcoverBack
                config={config}
                students={students}
                studentCount={students.length}
                pageCount={interiorCount}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

YearbookPrintBook.propTypes = {
  students: PropTypes.array,
  config: PropTypes.object,
  theme: PropTypes.string,
};
