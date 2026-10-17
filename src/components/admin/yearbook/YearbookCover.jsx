import React from 'react';
import PropTypes from 'prop-types';
import {
  BookOpen,
  Feather,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { detectCampuses, detectSections, detectSchools } from '../../../services/yearbookService';

// School name for covers: explicit title → selected school →
// most common school in the records. Never a hardcoded name.
function coverSchoolName(students = [], config = {}) {
  if ((config.institutionName || '').trim()) return config.institutionName.trim();
  if ((config.targetSchool || '').trim()) return config.targetSchool.trim();
  const schools = detectSchools(students);
  return schools[0]?.name || '';
}

const COVER_THEMES = {
  // ── Premium collection: deep browns, blues, and golden yellows ──
  midnight: {
    base: '#0e1e3a',
    bg: 'bg-[#0e1e3a]',
    border: 'border-[#233a63]',
    frame: 'border-amber-200/25',
    glow: 'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(245,214,123,0.16), transparent 70%)',
    eyebrow: 'text-amber-200/70',
    title: 'text-amber-50',
    sub: 'text-neutral-300',
    meta: 'text-amber-200/80',
    divider: 'bg-amber-200/60',
    art: 'text-amber-200',
  },
  royal: {
    base: '#16296b',
    bg: 'bg-[#16296b]',
    border: 'border-[#2f4bb3]',
    frame: 'border-yellow-200/30',
    glow: 'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(255,210,63,0.18), transparent 70%)',
    eyebrow: 'text-yellow-200/80',
    title: 'text-yellow-50',
    sub: 'text-blue-100',
    meta: 'text-yellow-200/90',
    divider: 'bg-yellow-300/70',
    art: 'text-yellow-200',
  },
  espresso: {
    base: '#2b1a12',
    bg: 'bg-[#2b1a12]',
    border: 'border-[#4a2f22]',
    frame: 'border-amber-200/25',
    glow: 'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(245,214,123,0.15), transparent 70%)',
    eyebrow: 'text-amber-200/70',
    title: 'text-amber-50',
    sub: 'text-orange-100/80',
    meta: 'text-amber-200/80',
    divider: 'bg-amber-200/60',
    art: 'text-amber-200',
  },
  marigold: {
    base: '#3d2c0e',
    bg: 'bg-[#3d2c0e]',
    border: 'border-[#6b4d1a]',
    frame: 'border-yellow-100/30',
    glow: 'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(255,224,102,0.20), transparent 70%)',
    eyebrow: 'text-yellow-100/80',
    title: 'text-yellow-50',
    sub: 'text-amber-100',
    meta: 'text-yellow-100/90',
    divider: 'bg-yellow-200/70',
    art: 'text-yellow-100',
  },
  noir: {
    base: '#141311',
    bg: 'bg-[#141311]',
    border: 'border-[#2c2a26]',
    frame: 'border-[#e8d9b0]/25',
    glow: 'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(232,217,176,0.14), transparent 70%)',
    eyebrow: 'text-[#e8d9b0]/70',
    title: 'text-[#f5edd8]',
    sub: 'text-neutral-300',
    meta: 'text-[#e8d9b0]/80',
    divider: 'bg-[#e8d9b0]/60',
    art: 'text-[#e8d9b0]',
  },
  // ── Legacy ids (old saved books keep rendering) ──
  navy: null,
  black: null,
  crimson: null,
  emerald: null,
};

const LEGACY_THEME_ALIAS = { navy: 'midnight', black: 'noir', crimson: 'espresso', emerald: 'midnight' };

function resolveTheme(key) {
  if (COVER_THEMES[key]) return COVER_THEMES[key];
  return COVER_THEMES[LEGACY_THEME_ALIAS[key] || 'midnight'];
}

// Campus + section line detected from the actual student records.
// Falls back to config values when the roster is empty.
function campusSectionLine(students = [], config = {}) {
  const parts = [];
  const campuses = detectCampuses(students);
  if (campuses.length > 0) parts.push(campuses.join(' · '));
  else if ((config.campus || '').trim()) parts.push(config.campus.trim());
  const sections = detectSections(students);
  if (sections.length > 0) parts.push(sections.join(' · '));
  else if ((config.sectionName || config.batchName || '').trim()) {
    parts.push(config.sectionName || config.batchName);
  }
  return parts.join('   ·   ');
}

function DiamondDivider({ tone }) {
  return (
    <div className="flex items-center justify-center gap-3 my-4">
      <div className={`h-px w-14 ${tone}`} />
      <div className={`h-1.5 w-1.5 rotate-45 border ${tone.replace('bg-', 'border-')}`} />
      <div className={`h-px w-14 ${tone}`} />
    </div>
  );
}

DiamondDivider.propTypes = {
  tone: PropTypes.string,
};

// ── Premium cover illustrations (gold line art, not basic shapes) ──────────
function ArtSunburst() {
  const cx = 200;
  const cy = 430;
  const rays = [];
  for (let i = 0; i <= 28; i++) {
    const deg = -72 + (i / 28) * 144;
    const rad = (deg * Math.PI) / 180;
    const x1 = cx + Math.sin(rad) * 120;
    const y1 = cy - Math.cos(rad) * 120;
    const x2 = cx + Math.sin(rad) * 330;
    const y2 = cy - Math.cos(rad) * 330;
    rays.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={i % 2 === 0 ? 1.4 : 0.7} opacity={i % 2 === 0 ? 0.9 : 0.5} />
    );
  }
  return (
    <svg viewBox="0 0 400 430" className="h-full w-full" fill="none" stroke="currentColor" preserveAspectRatio="xMidYMax slice">
      {rays}
      {[150, 200, 250, 300].map((r) => (
        <path key={r} d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} strokeWidth="1" opacity="0.7" />
      ))}
      <circle cx={cx} cy={cy} r="6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArtArches() {
  const centers = [20, 100, 180, 260, 340, 420];
  return (
    <svg viewBox="0 0 440 220" className="h-full w-full" fill="none" stroke="currentColor" preserveAspectRatio="xMidYMax slice">
      {centers.map((cx) => (
        <g key={cx}>
          <path d={`M ${cx - 34} 220 L ${cx - 34} 110 A 34 34 0 0 1 ${cx + 34} 110 L ${cx + 34} 220`} strokeWidth="1.4" opacity="0.85" />
          <path d={`M ${cx - 22} 220 L ${cx - 22} 116 A 22 22 0 0 1 ${cx + 22} 116 L ${cx + 22} 220`} strokeWidth="0.8" opacity="0.5" />
          <circle cx={cx} cy={66} r="2.5" fill="currentColor" stroke="none" />
        </g>
      ))}
      <line x1="0" y1="219" x2="440" y2="219" strokeWidth="1.4" />
    </svg>
  );
}

function ArtRings() {
  return (
    <svg viewBox="0 0 400 560" className="h-full w-full" fill="none" stroke="currentColor" preserveAspectRatio="xMidYMid slice">
      {[50, 95, 140, 185, 230].map((r) => (
        <circle key={r} cx="200" cy="150" r={r} strokeWidth="1" opacity={r % 2 ? 0.5 : 0.8} />
      ))}
      <circle cx="200" cy="150" r="4" fill="currentColor" stroke="none" />
      <circle cx="345" cy="470" r="60" strokeWidth="1" opacity="0.5" />
      <circle cx="345" cy="470" r="85" strokeWidth="0.8" opacity="0.3" />
      <circle cx="55" cy="430" r="3" fill="currentColor" stroke="none" opacity="0.8" />
      <circle cx="75" cy="455" r="2" fill="currentColor" stroke="none" opacity="0.6" />
    </svg>
  );
}

function ArtCorners() {
  const corners = [
    'top-4 left-4',
    'top-4 right-4 rotate-90',
    'bottom-4 right-4 rotate-180',
    'bottom-4 left-4 -rotate-90',
  ];
  return (
    <>
      {corners.map((pos, i) => (
        <div key={i} className={`absolute ${pos} h-20 w-20 sm:h-24 sm:w-24 pointer-events-none`}>
          <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke="currentColor">
            <path d="M4 78 V28 Q4 4 28 4 H78" strokeWidth="1.6" />
            <path d="M13 78 V32 Q13 13 32 13 H78" strokeWidth="0.9" opacity="0.6" />
            <circle cx="40" cy="4" r="2.6" fill="currentColor" stroke="none" />
            <circle cx="4" cy="40" r="2.6" fill="currentColor" stroke="none" />
          </svg>
        </div>
      ))}
    </>
  );
}

export function CoverArt({ name = 'sunburst', className = '' }) {
  if (!name || name === 'none') return null;
  if (name === 'corners') return <div className={className}><ArtCorners /></div>;
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {name === 'arches' ? <ArtArches /> : name === 'rings' ? <ArtRings /> : <ArtSunburst />}
    </div>
  );
}

CoverArt.propTypes = {
  name: PropTypes.string,
  className: PropTypes.string,
};

export function YearbookHardcoverFront({ config = {}, students = [], onOpenBook }) {
  const themeKey = config.coverColor || 'midnight';
  const theme = resolveTheme(themeKey);
  const logoUrl = (config.coverLogoUrl || '').trim();
  const bgUrl = (config.coverBgUrl || '').trim();
  const shade = Math.min(92, Math.max(30, Number(config.coverBgShade ?? 72)));
  const art = config.coverArt || 'sunburst';
  const placeLine = campusSectionLine(students, config);
  const schoolName = coverSchoolName(students, config);
  const coverPhotos = (students || []).filter((s) => s.photoUrl).slice(0, 3);

  return (
    <div
      className={`h-full w-full ${theme.bg} text-white flex flex-col p-8 sm:p-12 font-serif select-none relative overflow-hidden border-4 ${theme.border}`}
    >
      {/* Custom background photo with theme scrim */}
      {bgUrl && (
        <>
          <img src={bgUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: theme.base, opacity: shade / 100 }} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent 25%, ${theme.base} 94%)` }}
          />
        </>
      )}

      {/* Soft top glow (no-bg covers) */}
      {!bgUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: theme.glow }}
        />
      )}

      {/* Premium illustration layer */}
      <CoverArt name={art} className={`${theme.art} opacity-40`} />

      {/* Delicate double hairline frame (corners art carries its own) */}
      {art !== 'corners' && (
        <>
          <div className={`absolute inset-4 border ${theme.frame} pointer-events-none`} />
          <div className={`absolute inset-[22px] border ${theme.frame} opacity-60 pointer-events-none`} />
        </>
      )}

      {/* Top eyebrow */}
      <div className="relative z-10 text-center pt-4 shrink-0">
        {(config.volumeNumber || '').trim() ? (
          <p className={`text-xs tracking-[0.35em] uppercase font-sans font-semibold ${theme.eyebrow}`}>
            {config.volumeNumber}
          </p>
        ) : (
          <p className={`text-xs tracking-[0.35em] uppercase font-sans font-semibold ${theme.eyebrow}`}>
            Yearbook
          </p>
        )}
      </div>

      {/* Center — school name hero with photo + vector art */}
      <div className="relative z-10 my-auto text-center py-4">
        {/* Uploaded logo seal (only when provided) */}
        {logoUrl && (
          <div className="mx-auto mb-5 h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-amber-200/50 flex items-center justify-center overflow-hidden">
            <img src={logoUrl} alt="School logo" className="h-full w-full object-cover" />
          </div>
        )}

        {schoolName && (
          <h1 className={`font-serif font-medium uppercase leading-tight tracking-[0.1em] text-2xl sm:text-4xl lg:text-5xl ${theme.title}`}>
            {schoolName}
          </h1>
        )}

        {(config.programName || '').trim() && (
          <p className={`mt-3 text-[11px] sm:text-xs uppercase tracking-[0.25em] font-sans font-medium ${theme.sub}`}>
            {config.programName}
          </p>
        )}

        <DiamondDivider tone={theme.divider} />

        {/* Photo art — arched portraits over the vector rings */}
        {coverPhotos.length > 0 && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 mt-1">
            {coverPhotos.map((stu, i) => {
              const isMiddle = coverPhotos.length > 1 && i === 1;
              const tilt = coverPhotos.length > 1 ? (i === 0 ? '-rotate-3' : i === coverPhotos.length - 1 ? 'rotate-3' : '') : '';
              return (
                <div
                  key={stu.id || i}
                  className={`${isMiddle ? 'w-24 sm:w-32 lg:w-40' : 'w-16 sm:w-24 lg:w-28'} aspect-[3/4] overflow-hidden rounded-t-full ring-1 ring-amber-200/60 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${tilt}`}
                >
                  <img
                    src={stu.photoUrl}
                    alt={stu.name}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              );
            })}
          </div>
        )}

        {!logoUrl && coverPhotos.length === 0 && (
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-full border border-amber-200/50 flex items-center justify-center">
            <div className="h-[64px] w-[64px] sm:h-[76px] sm:w-[76px] rounded-full border border-amber-200/30 flex items-center justify-center">
              <GraduationCap className="text-amber-200/90 w-8 h-8 sm:w-9 sm:h-9" strokeWidth={1.25} />
            </div>
          </div>
        )}

        {placeLine && (
          <p className={`mt-5 text-xs sm:text-sm tracking-[0.2em] uppercase font-sans font-semibold ${theme.meta}`}>
            {placeLine}
          </p>
        )}

        {(config.academicYear || '').trim() && (
          <p className={`mt-2 text-[11px] sm:text-xs tracking-[0.3em] font-mono ${theme.meta}`}>
            {config.academicYear}
          </p>
        )}
      </div>

      {/* Bottom */}
      <div className="relative z-10 pb-4 text-center shrink-0">
        {(config.curatorName || '').trim() && (
          <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-400 font-sans">
            {config.curatorName}
          </p>
        )}

        {onOpenBook && (
          <button
            type="button"
            onClick={onOpenBook}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-200/40 text-amber-100/90 text-xs font-sans font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-amber-200/10 cursor-pointer"
          >
            <BookOpen size={14} />
            <span>Open</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

YearbookHardcoverFront.propTypes = {
  config: PropTypes.object,
  students: PropTypes.array,
  onOpenBook: PropTypes.func,
};

export function YearbookInsideDedication({ config = {}, students = [] }) {
  const message = (config.principalMessage || '').trim();
  const signerName = (config.principalName || '').trim();
  const signerTitle = (config.principalTitle || '').trim();
  const placeLine = campusSectionLine(students, config);
  const schoolName = coverSchoolName(students, config);

  return (
    <div className="h-full w-full bg-[#fbf9f3] text-neutral-800 flex flex-col p-8 sm:p-12 font-serif select-none relative overflow-hidden">
      {/* Hairline frame */}
      <div className="absolute inset-4 border border-neutral-900/10 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center pt-4 shrink-0">
        {schoolName && (
          <h3 className="text-xs tracking-[0.3em] uppercase font-semibold text-neutral-800 font-sans">
            {schoolName}
          </h3>
        )}
        {placeLine && (
          <p className="mt-1.5 text-xs tracking-[0.25em] uppercase text-neutral-500 font-sans">
            {placeLine}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="relative z-10 my-auto px-2 sm:px-8 text-center">
        <div className="mx-auto mb-5 h-px w-12 bg-neutral-900/20" />
        {message ? (
          <p className="text-sm sm:text-base text-neutral-700 leading-loose font-serif italic max-w-md mx-auto">
            &ldquo;{message}&rdquo;
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
            [ Message from the school — to be provided ]
          </p>
        )}

        {(signerName || signerTitle) && (
          <div className="mt-8 max-w-xs mx-auto">
            {signerName && (
              <p className="font-serif italic text-base sm:text-lg text-neutral-900 font-semibold">
                {signerName}
              </p>
            )}
            {signerTitle && (
              <p className="mt-1 text-xs text-neutral-500 font-sans uppercase tracking-[0.2em]">
                {signerTitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-4 shrink-0">
        {(config.academicYear || '').trim() && (
          <p className="text-xs tracking-[0.3em] text-neutral-400 font-mono">
            {config.academicYear}
          </p>
        )}
      </div>
    </div>
  );
}

YearbookInsideDedication.propTypes = {
  config: PropTypes.object,
  students: PropTypes.array,
};

export function YearbookHardcoverBack({ config = {}, students = [], studentCount = 0, pageCount = 0 }) {
  const theme = resolveTheme(config.coverColor || 'midnight');
  const art = config.coverArt || 'sunburst';
  const backTitle = (config.backTitle || '').trim();
  const backMessage = (config.backMessage || '').trim();
  const backCredit = (config.backCredit || config.curatorName || '').trim();
  const showCounts = config.showBackCounts !== false;
  const placeLine = campusSectionLine(students, config);
  const title = backTitle || coverSchoolName(students, config);

  return (
    <div
      className={`h-full w-full ${theme.bg} text-white flex flex-col p-8 sm:p-12 font-serif select-none relative overflow-hidden border-4 ${theme.border}`}
    >
      {/* Soft glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: theme.glow }}
      />

      {/* Matching illustration, kept subtle */}
      <CoverArt name={art} className={`${theme.art} opacity-25`} />

      {/* Delicate double hairline frame (corners art carries its own) */}
      {art !== 'corners' && (
        <>
          <div className={`absolute inset-4 border ${theme.frame} pointer-events-none`} />
          <div className={`absolute inset-[22px] border ${theme.frame} opacity-60 pointer-events-none`} />
        </>
      )}

      {/* Top eyebrow */}
      <div className="relative z-10 text-center pt-4 shrink-0">
        {placeLine ? (
          <p className={`text-xs tracking-[0.3em] uppercase font-sans font-semibold ${theme.eyebrow}`}>
            {placeLine}
          </p>
        ) : (
          <p className={`text-xs tracking-[0.3em] uppercase font-sans font-semibold ${theme.eyebrow}`}>
            Closing
          </p>
        )}
      </div>

      {/* Center */}
      <div className="relative z-10 my-auto text-center py-6">
        {title && (
          <h3 className={`font-serif font-medium uppercase leading-snug tracking-[0.12em] text-xl sm:text-2xl lg:text-3xl ${theme.title}`}>
            {title}
          </h3>
        )}

        {(config.academicYear || '').trim() && (
          <p className={`mt-3 text-[11px] sm:text-xs tracking-[0.3em] font-mono ${theme.meta}`}>
            {config.academicYear}
          </p>
        )}

        {(backMessage || (showCounts && studentCount > 0)) && (
          <>
            <DiamondDivider tone={theme.divider} />
            {backMessage && (
              <p className="text-xs sm:text-sm text-neutral-300 max-w-xs mx-auto leading-loose font-sans">
                {backMessage}
              </p>
            )}
            {showCounts && studentCount > 0 && (
              <p className={`mt-3 text-[11px] tracking-[0.25em] uppercase font-sans ${theme.meta}`}>
                {`${studentCount} student${studentCount === 1 ? '' : 's'}`}
                {pageCount > 0 ? ` · ${pageCount} page${pageCount === 1 ? '' : 's'}` : ''}
              </p>
            )}
          </>
        )}
      </div>

      {/* Bottom credit */}
      <div className="relative z-10 pb-4 text-center shrink-0">
        {backCredit && (
          <p className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-neutral-400 font-sans">
            <Feather size={11} className="text-amber-200/70" />
            <span>{backCredit}</span>
          </p>
        )}
      </div>
    </div>
  );
}

YearbookHardcoverBack.propTypes = {
  config: PropTypes.object,
  students: PropTypes.array,
  studentCount: PropTypes.number,
  pageCount: PropTypes.number,
};

export const COVER_COLOR_OPTIONS = [
  { id: 'midnight', name: 'Midnight Blue · Gold' },
  { id: 'royal', name: 'Royal Sapphire · Yellow' },
  { id: 'espresso', name: 'Espresso Brown · Gold' },
  { id: 'marigold', name: 'Marigold Bronze · Yellow' },
  { id: 'noir', name: 'Noir Champagne · Gold' },
];

export const COVER_ART_OPTIONS = [
  { id: 'sunburst', name: 'Sunburst Deco' },
  { id: 'arches', name: 'Arch Colonnade' },
  { id: 'rings', name: 'Orbit Rings' },
  { id: 'corners', name: 'Corner Filigree' },
  { id: 'none', name: 'None' },
];
