import React from 'react';
import PropTypes from 'prop-types';
import { Award, CameraOff } from 'lucide-react';
import {
  DEFAULT_CUSTOM_TEMPLATE,
  getStudentsForPage,
  resolveSchoolCrest,
} from '../../../services/yearbookService';

/**
 * YearbookPageCustom
 * ==================
 * Renders an A4 interior portrait sheet layered over a custom Canva / Figma / Studio
 * background design, with live-tweakable margins, spacing, typography, card styles,
 * and automatic population from batch/individual student records.
 */
export default function YearbookPageCustom({
  pageNumber,
  students = [],
  config = {},
  onSelectStudent,
}) {
  const tpl = {
    ...DEFAULT_CUSTOM_TEMPLATE,
    ...(config.customTemplate || {}),
  };

  const density = config.layoutDensity || 6;
  const pageStudents = getStudentsForPage(students, pageNumber, density);
  const photoShape = tpl.photoShape && tpl.photoShape !== 'inherit'
    ? tpl.photoShape
    : (config.photoCut || '2x2');
  const photoTone = config.photoTone || 'natural';

  const gridClasses = {
    4: 'grid-cols-2',
    6: 'grid-cols-2 sm:grid-cols-3',
    8: 'grid-cols-2 sm:grid-cols-4',
    9: 'grid-cols-3',
    12: 'grid-cols-3 sm:grid-cols-4',
  }[density] || 'grid-cols-2 sm:grid-cols-3';

  const frameShapeClass = {
    '2x2': 'aspect-square',
    '2x3': 'aspect-[2/3]',
    'oval': 'aspect-[3/4] rounded-full',
  }[photoShape] || 'aspect-square';

  const filterClass = {
    natural: '',
    bw: 'grayscale contrast-125',
    sepia: 'sepia-[0.4] contrast-105',
  }[photoTone] || '';

  const schoolName = (config.institutionName || config.targetSchool || '').trim();
  const crest = !config.hideCoverLogo
    ? ((config.coverLogoUrl || '').trim() || resolveSchoolCrest(schoolName)?.src || '')
    : '';

  const bgOpacity = Math.min(95, Math.max(0, Number(tpl.cardBgOpacity ?? 90))) / 100;
  const scrimOpacity = Math.min(85, Math.max(0, Number(tpl.bgScrimOpacity ?? 10))) / 100;
  const fontScale = Number(tpl.fontScale || 1);

  const getCardSurfaceStyle = () => {
    const baseRadius = `${tpl.cardRadius ?? 14}px`;
    if (tpl.cardStyle === 'transparent') {
      return {
        backgroundColor: 'transparent',
        borderRadius: baseRadius,
        borderColor: 'transparent',
      };
    }
    if (tpl.cardStyle === 'glass-dark') {
      return {
        backgroundColor: `rgba(17, 17, 20, ${bgOpacity})`,
        borderRadius: baseRadius,
        borderColor: `${tpl.accentColor}55`,
      };
    }
    if (tpl.cardStyle === 'bordered') {
      return {
        backgroundColor: `rgba(255, 255, 255, ${bgOpacity * 0.6})`,
        borderRadius: baseRadius,
        borderColor: `${tpl.accentColor}`,
      };
    }
    return {
      backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
      borderRadius: baseRadius,
      borderColor: `${tpl.accentColor}40`,
    };
  };

  return (
    <div
      className="h-full w-full flex flex-col justify-between select-none relative overflow-hidden bg-white"
      style={{
        paddingTop: `${tpl.paddingTop ?? 52}px`,
        paddingBottom: `${tpl.paddingBottom ?? 34}px`,
        paddingLeft: `${tpl.paddingX ?? 28}px`,
        paddingRight: `${tpl.paddingX ?? 28}px`,
        color: tpl.textColor || '#171717',
      }}
    >
      {/* 1. Custom Canva / PDF Background Image */}
      {tpl.interiorBgUrl && (
        <img
          src={tpl.interiorBgUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Optional readability scrim over textured Canva artwork */}
      {scrimOpacity > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: tpl.cardStyle === 'glass-dark' ? '#0c0b0a' : '#ffffff',
            opacity: scrimOpacity,
          }}
        />
      )}

      {/* Editor-only dotted alignment guide (automatically stripped in PDF print) */}
      {tpl.showGuides && (
        <div
          aria-hidden="true"
          className="yb-no-print absolute pointer-events-none border-2 border-dashed border-amber-500/70 z-30"
          style={{
            top: `${tpl.paddingTop ?? 52}px`,
            bottom: `${tpl.paddingBottom ?? 34}px`,
            left: `${tpl.paddingX ?? 28}px`,
            right: `${tpl.paddingX ?? 28}px`,
          }}
        />
      )}

      {/* 2. Dynamic Header */}
      {tpl.showHeader !== false ? (
        <header
          className="relative z-10 pb-2 mb-3 flex items-center justify-between gap-3 border-b shrink-0"
          style={{
            borderColor: `${tpl.accentColor}45`,
            color: tpl.headerColor || tpl.textColor || '#171717',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {tpl.showSchoolCrest !== false && crest && (
              <img
                src={crest}
                alt={schoolName || 'School Seal'}
                className="w-6 h-6 rounded-full object-contain bg-white/90 p-0.5 shrink-0 border"
                style={{ borderColor: `${tpl.accentColor}50` }}
              />
            )}
            <div className="min-w-0">
              <span className="font-heading font-bold uppercase tracking-widest text-[11px] truncate block">
                {schoolName}
              </span>
              {(config.sectionName || config.batchName) && (
                <span
                  className="text-[10px] font-sans uppercase tracking-wider truncate block opacity-80"
                  style={{ color: tpl.mutedTextColor || '#525252' }}
                >
                  {config.sectionName || config.batchName}
                </span>
              )}
            </div>
          </div>

          {config.academicYear && (
            <span
              className="font-mono text-xs font-bold tracking-wider shrink-0"
              style={{ color: tpl.accentColor || '#b47b2b' }}
            >
              {config.academicYear}
            </span>
          )}
        </header>
      ) : (
        <div className="shrink-0" />
      )}

      {/* 3. Auto-Populated Student Portrait Grid */}
      <div className="relative z-10 flex-1 flex flex-col justify-center my-auto">
        {pageStudents.length > 0 ? (
          <div
            className={`grid ${gridClasses}`}
            style={{
              gap: `${tpl.gridGap ?? 14}px`,
              transform: `translate(${Number(tpl.cardOffsetX || 0)}px, ${Number(tpl.cardOffsetY || 0)}px)`,
            }}
          >
            {pageStudents.map((stu) => (
              <button
                key={stu.id}
                type="button"
                onClick={() => onSelectStudent?.(stu)}
                className="group flex flex-col items-center text-center p-2 sm:p-2.5 border transition-all duration-200 hover:shadow-lg cursor-pointer relative"
                style={getCardSurfaceStyle()}
              >
                <div
                  className={`${frameShapeClass} bg-neutral-900 overflow-hidden relative mb-2 border shadow-xs`}
                  style={{
                    width: `${Math.min(100, Math.max(55, Number(tpl.photoSizePct ?? 86)))}%`,
                    maxWidth: '124px',
                    borderRadius: photoShape === 'oval' ? '9999px' : `${Math.max(4, (tpl.cardRadius ?? 14) - 4)}px`,
                    borderColor: `${tpl.accentColor || '#b47b2b'}80`,
                  }}
                >
                  {stu.photoUrl ? (
                    <img
                      src={stu.photoUrl}
                      alt={stu.name}
                      className={`w-full h-full object-cover ${filterClass} transition-transform duration-300 group-hover:scale-105`}
                      style={{
                        transform: `scale(${stu.photoSpecs?.zoom || 1}) translate(${stu.photoSpecs?.panX || 0}%, ${stu.photoSpecs?.panY || 0}%)`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-neutral-800 text-amber-200/80">
                      <CameraOff size={18} className="mb-1 opacity-70" />
                      <span className="text-[9px] font-mono uppercase tracking-wider">No Photo</span>
                    </div>
                  )}

                  {stu.isOfficer && (
                    <span
                      className="absolute top-0 inset-x-0 text-[9px] font-bold uppercase text-center py-0.5 text-neutral-950"
                      style={{ backgroundColor: tpl.accentColor || '#c9a96e' }}
                    >
                      {stu.role || 'Officer'}
                    </span>
                  )}
                </div>

                <h4
                  className="font-heading font-bold truncate w-full leading-tight"
                  style={{
                    fontSize: `${13 * fontScale}px`,
                    color: tpl.cardStyle === 'glass-dark' ? '#fafaf9' : (tpl.textColor || '#171717'),
                  }}
                >
                  {stu.name}
                </h4>

                {(stu.studentId || stu.nickname) && (
                  <p
                    className="font-mono truncate w-full mt-0.5"
                    style={{
                      fontSize: `${10.5 * fontScale}px`,
                      color: tpl.cardStyle === 'glass-dark' ? '#d4d4d8' : (tpl.mutedTextColor || '#525252'),
                    }}
                  >
                    {stu.studentId || stu.nickname}
                  </p>
                )}

                {config.showHonors !== false && stu.honors && (
                  <span
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-sans font-bold truncate max-w-full border"
                    style={{
                      fontSize: `${9.5 * fontScale}px`,
                      color: tpl.accentColor || '#b47b2b',
                      borderColor: `${tpl.accentColor || '#b47b2b'}55`,
                      backgroundColor: `${tpl.accentColor || '#b47b2b'}14`,
                    }}
                  >
                    <Award size={9} />
                    <span className="truncate">{stu.honors}</span>
                  </span>
                )}

                {config.showQuotes !== false && stu.motto && (
                  <p
                    className="mt-1 italic line-clamp-2 leading-tight px-1 font-serif"
                    style={{
                      fontSize: `${10.5 * fontScale}px`,
                      color: tpl.cardStyle === 'glass-dark' ? '#e5e5e5' : (tpl.mutedTextColor || '#525252'),
                    }}
                  >
                    &ldquo;{stu.motto}&rdquo;
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 px-4 opacity-75">
            <p className="font-heading text-sm font-semibold">Custom Template Ready</p>
            <p className="text-xs font-sans mt-1 max-w-xs" style={{ color: tpl.mutedTextColor }}>
              Sync school bookings or import a section roster to auto-fill portraits and text onto this layout.
            </p>
          </div>
        )}
      </div>

      {/* 4. Dynamic Footer */}
      {tpl.showFooter !== false ? (
        <footer
          className="relative z-10 pt-2 mt-3 border-t flex items-center justify-between text-[10px] font-sans shrink-0"
          style={{
            borderColor: `${tpl.accentColor}35`,
            color: tpl.mutedTextColor || '#525252',
          }}
        >
          <span className="truncate">{config.programName || config.sectionName || schoolName}</span>
          <span className="font-mono font-bold" style={{ color: tpl.accentColor || '#b47b2b' }}>
            Page {pageNumber}
          </span>
        </footer>
      ) : (
        <div className="shrink-0" />
      )}
    </div>
  );
}

YearbookPageCustom.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
};
