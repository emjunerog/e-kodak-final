import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  Award,
  Quote,
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
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
import { playRealisticPageFlipSound } from '../../../services/yearbookService';

export default function YearbookFlipbook({
  students = [],
  config = {},
  theme = 'classic',
  onEditStudent,
}) {
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const containerRef = useRef(null);

  const density = config.layoutDensity || 6;

  // Calculate interior student pages and spreads
  // Spread 0: Hardcover Front
  // Spread 1: Dedication + Section Directory
  // Spreads 2..(1 + studentSpreads): Student portrait pages
  // Final Spread: Concluding spread + Hardcover Back Cover
  const totalStudentPages = Math.max(2, Math.ceil(Math.max(1, students.length) / density));
  const normalizedStudentPages = totalStudentPages % 2 === 0 ? totalStudentPages : totalStudentPages + 1;
  const studentSpreadsCount = normalizedStudentPages / 2;

  // Total spreads = 1 (Cover) + 1 (Intro) + studentSpreadsCount + 1 (Back Cover)
  const totalSpreads = 2 + studentSpreadsCount + 1;

  const goToNextSpread = () => {
    if (currentSpreadIndex < totalSpreads - 1) {
      if (soundEnabled) playRealisticPageFlipSound();
      setIsFlipping(true);
      setTimeout(() => setIsFlipping(false), 320);
      setCurrentSpreadIndex((prev) => prev + 1);
    }
  };

  const goToPrevSpread = () => {
    if (currentSpreadIndex > 0) {
      if (soundEnabled) playRealisticPageFlipSound();
      setIsFlipping(true);
      setTimeout(() => setIsFlipping(false), 320);
      setCurrentSpreadIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowRight') goToNextSpread();
      if (e.key === 'ArrowLeft') goToPrevSpread();
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSpreadIndex, totalSpreads, isFullscreen, soundEnabled]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Render chosen template for an interior page
  const renderInteriorPage = (pageNumber) => {
    const props = {
      pageNumber,
      students,
      config,
      onSelectStudent: (stu) => setSelectedStudent(stu),
    };

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

  // Render left and right sides of current spread
  const renderSpreadContent = () => {
    // Spread 0: Front Hardcover Spread
    if (currentSpreadIndex === 0) {
      return (
        <>
          {/* Left: Decorative Endpaper / Inside Flap */}
          <div className="w-1/2 h-full bg-[#1e293b] text-neutral-400 p-6 flex flex-col justify-between items-center text-center relative border-r border-black/40">
            <div className="w-full flex justify-between text-xs font-mono text-neutral-500">
              <span>{config.institutionName || ''}</span>
              <span>{config.academicYear || ''}</span>
            </div>
            <div className="my-auto max-w-xs space-y-2 opacity-60">
              <BookOpen size={40} className="mx-auto text-amber-400/60 stroke-[1.2]" />
              <p className="text-xs font-serif italic text-neutral-300">
                {config.sectionName || config.batchName || ''}
              </p>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest">
              {config.volumeNumber || ''}
            </span>
          </div>

          {/* Right: Front Hardcover */}
          <div className="w-1/2 h-full relative">
            <YearbookHardcoverFront config={config} students={students} onOpenBook={goToNextSpread} />
          </div>
        </>
      );
    }

    // Spread 1: Opening Spread (Dedication + Section Opener)
    if (currentSpreadIndex === 1) {
      return (
        <>
          <div className="w-1/2 h-full relative">
            <YearbookInsideDedication config={config} students={students} />
          </div>
          <div className="w-1/2 h-full relative">
            <YearbookSectionOpener
              students={students}
              config={config}
              onSelectStudent={(stu) => setSelectedStudent(stu)}
            />
          </div>
        </>
      );
    }

    // Final Spread: Back Cover Spread
    if (currentSpreadIndex === totalSpreads - 1) {
      const lastStudentPageNum = normalizedStudentPages;
      const interiorCount = Math.max(0, Math.ceil(students.length / density));
      return (
        <>
          <div className="w-1/2 h-full relative">
            {renderInteriorPage(lastStudentPageNum)}
          </div>
          <div className="w-1/2 h-full relative">
            <YearbookHardcoverBack config={config} students={students} studentCount={students.length} pageCount={interiorCount} />
          </div>
        </>
      );
    }

    // Intermediate Spreads: Student Portrait Pages
    // currentSpreadIndex is between 2 and (totalSpreads - 2)
    const relativeSpread = currentSpreadIndex - 2;
    const leftPageNum = relativeSpread * 2 + 1;
    const rightPageNum = leftPageNum + 1;

    return (
      <>
        <div className="w-1/2 h-full relative">
          {renderInteriorPage(leftPageNum)}
        </div>
        <div className="w-1/2 h-full relative">
          {renderInteriorPage(rightPageNum)}
        </div>
      </>
    );
  };

  // Label for current spread
  const getSpreadLabel = () => {
    if (currentSpreadIndex === 0) return 'Cover';
    if (currentSpreadIndex === 1) return 'Message & Directory';
    if (currentSpreadIndex === totalSpreads - 1) return 'Closing page';
    const rel = currentSpreadIndex - 2;
    return `Student pages ${rel * 2 + 1}–${rel * 2 + 2}`;
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center justify-between transition-all select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-neutral-950 p-6' : 'w-full'
      }`}
    >
      {/* ── 3D Physical Flippable Book Container (A4 spread: 420 × 297) ─── */}
      <div className="w-full max-w-6xl mx-auto my-1 perspective-[1400px]">
        <div
          className={`relative w-full aspect-[420/297] max-h-[820px] rounded-2xl shadow-2xl flex transition-transform duration-300 ${
            isFlipping ? 'scale-[0.985]' : 'scale-100'
          }`}
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Spread Content (Left and Right halves) */}
          <div className="w-full h-full flex rounded-2xl overflow-hidden relative">
            {renderSpreadContent()}

            {/* Book Center Binding Spine Divider */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 shadow-[0_0_12px_rgba(0,0,0,0.8)] z-20 pointer-events-none flex items-center justify-center">
              <div className="w-0.5 h-4/5 bg-amber-400/20 rounded-full" />
            </div>

            {/* Left Edge Spine Crease Shade */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-[48px] w-12 bg-gradient-to-r from-transparent to-black/30 pointer-events-none z-15" />
            {/* Right Edge Spine Crease Shade */}
            <div className="absolute inset-y-0 left-1/2 w-12 bg-gradient-to-r from-black/30 to-transparent pointer-events-none z-15" />
          </div>

          {/* Book Edge Pages Illusion Layer (stack of physical paper pages) */}
          <div className="absolute -bottom-2 inset-x-4 h-2 bg-neutral-200/90 rounded-b-lg border-b border-neutral-300 shadow-sm pointer-events-none" />
          <div className="absolute -bottom-3.5 inset-x-7 h-1.5 bg-neutral-300/80 rounded-b border-b border-neutral-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Flipbook Navigation & Controls Bar ──────────────────────────── */}
      <div className="w-full max-w-4xl mx-auto mt-4 px-4 py-2.5 bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-2xl shadow-md flex items-center justify-between text-neutral-600 font-body shrink-0">
        
        {/* Left: Previous / Next & Indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevSpread}
            disabled={currentSpreadIndex === 0}
            className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-neutral-800 font-mono">
              Spread {currentSpreadIndex + 1} of {totalSpreads}
            </span>
            <span className="text-xs text-neutral-500 font-sans hidden sm:inline">
              {getSpreadLabel()}
            </span>
          </div>

          <button
            type="button"
            onClick={goToNextSpread}
            disabled={currentSpreadIndex >= totalSpreads - 1}
            className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center: Quick Jump Spread Thumbnails */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1 max-w-sm">
          {Array.from({ length: totalSpreads }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (soundEnabled) playRealisticPageFlipSound();
                setCurrentSpreadIndex(idx);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer shrink-0 ${
                currentSpreadIndex === idx
                  ? 'bg-neutral-900 text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {idx === 0
                ? 'Cover'
                : idx === 1
                ? 'Directory'
                : idx === totalSpreads - 1
                ? 'Back'
                : `Sp.${idx}`}
            </button>
          ))}
        </div>

        {/* Right: Audio & Fullscreen Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100'
                : 'border-neutral-200 text-neutral-400 bg-neutral-50 hover:bg-neutral-100'
            }`}
            title={soundEnabled ? 'Mute Page Flip Audio' : 'Enable Page Flip Audio'}
          >
            {soundEnabled ? <Volume2 size={16} className="text-amber-700" /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Read in Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ── Student Spotlight Pop-up Modal ─────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-in fade-in zoom-in-95 duration-150 relative">
            
            {/* Header Banner */}
            <div className="h-28 bg-gradient-to-r from-neutral-900 via-neutral-800 to-amber-950 p-4 flex justify-between items-start text-white relative">
              <span className="text-xs uppercase font-bold tracking-widest text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-amber-400" />
                <span>Student</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Avatar & Details */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="flex justify-between items-end -mt-12 mb-3">
                <div className="w-24 h-28 rounded-2xl overflow-hidden bg-neutral-900 ring-4 ring-white shadow-xl relative">
                  {selectedStudent.photoUrl ? (
                    <img
                      src={selectedStudent.photoUrl}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800 text-amber-300/80 text-[10px] font-mono p-1 text-center">
                      <Camera size={18} className="mb-1" />
                      <span>NO PHOTO</span>
                    </div>
                  )}
                </div>

                {onEditStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      const stuToEdit = selectedStudent;
                      setSelectedStudent(null);
                      onEditStudent(stuToEdit);
                    }}
                    className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Sliders size={13} className="text-amber-400" />
                    <span>Edit Profile Details</span>
                  </button>
                )}
              </div>

              {/* Student Name & Titles */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-neutral-900">
                    {selectedStudent.name}
                  </h3>
                  {selectedStudent.isOfficer && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-300">
                      {selectedStudent.role}
                    </span>
                  )}
                </div>
                {(selectedStudent.studentId || selectedStudent.degree || selectedStudent.credentials) && (
                  <p className="text-xs font-semibold text-neutral-500 font-mono">
                    {[selectedStudent.studentId ? `ID: ${selectedStudent.studentId}` : null,
                      selectedStudent.degree || selectedStudent.credentials].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Honors Badge */}
              {selectedStudent.honors && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                  <Award size={13} className="text-amber-700" />
                  <span>{selectedStudent.honors}</span>
                </div>
              )}

              {/* Motto / Senior Quote — only when provided */}
              {selectedStudent.motto ? (
                <div className="mt-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <p className="text-xs uppercase font-bold text-neutral-400 tracking-wider mb-1 flex items-center gap-1">
                    <Quote size={11} className="text-amber-600" />
                    <span>Motto</span>
                  </p>
                  <p className="text-xs text-neutral-700 italic leading-relaxed font-serif">
                    &ldquo;{selectedStudent.motto}&rdquo;
                  </p>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

YearbookFlipbook.propTypes = {
  students: PropTypes.array,
  config: PropTypes.object,
  theme: PropTypes.string,
  onEditStudent: PropTypes.func,
};
