import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Camera,
  Printer,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Maximize2,
  Layers,
  Award,
} from 'lucide-react';

export default function TwoByTwoRollModal({
  isOpen,
  onClose,
  student,
  students = [],
  onUpdateStudentPhotoSpecs,
  onOpenFullEditor,
}) {
  const [activeStudentId, setActiveStudentId] = useState(student ? student.id : (students[0]?.id || ''));
  const [zoom, setZoom] = useState(student?.photoSpecs?.zoom || 1);
  const [panX, setPanX] = useState(student?.photoSpecs?.panX || 0);
  const [panY, setPanY] = useState(student?.photoSpecs?.panY || 0);
  const [frameCut, setFrameCut] = useState('2x2'); // '2x2' | '2x3' | 'passport'
  const [showGuides, setShowGuides] = useState(true);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === activeStudentId) || student || students[0];

  if (!currentStudent) return null;

  const handleSelectStudent = (s) => {
    setActiveStudentId(s.id);
    setZoom(s.photoSpecs?.zoom || 1);
    setPanX(s.photoSpecs?.panX || 0);
    setPanY(s.photoSpecs?.panY || 0);
  };

  const handleApplySpecs = () => {
    if (onUpdateStudentPhotoSpecs) {
      onUpdateStudentPhotoSpecs(currentStudent.id, {
        zoom,
        panX,
        panY,
        aspectRatio: frameCut,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Crop size={18} />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-neutral-900">
                Official 2×2 Photo Verification &amp; Print Framing
              </h3>
              <p className="text-xs text-neutral-500">
                Inspect physical print dimensions (51×51mm @ 300 DPI), eye-level alignment, and crop composition
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Student Roster Selector */}
          <div className="w-full md:w-64 border-r border-neutral-200 p-4 bg-neutral-50/50 flex flex-col overflow-hidden">
            <p className="text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-2">
              Select Candidate ({students.length})
            </p>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {students.map((stu) => {
                const isSelected = stu.id === currentStudent.id;
                const hasPhoto = !!stu.photoUrl;

                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => handleSelectStudent(stu)}
                    className={`w-full p-2 rounded-xl text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200/80'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-800 shrink-0 relative">
                      {hasPhoto ? (
                        <img
                          src={stu.photoUrl}
                          alt={stu.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-amber-300 font-mono">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                        {stu.name}
                      </p>
                      <p className={`text-xs font-mono truncate ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {stu.studentId || 'No ID'}
                      </p>
                    </div>
                    {hasPhoto ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Column: Live 2×2 Crop Viewport with Calibrated Grid */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-neutral-900 text-white relative overflow-hidden">
            
            {/* Physical Print Spec Ribbon */}
            <div className="absolute top-3 inset-x-6 flex items-center justify-between text-[11px] font-mono text-neutral-400 z-20">
              <span className="flex items-center gap-1.5 text-amber-300">
                <CheckCircle2 size={13} />
                <span>PHYSICAL PRINT SPEC: 2.0 × 2.0 INCHES (50.8 × 50.8 MM)</span>
              </span>
              <span>CALIBRATION: 600×600 PX @ 300 DPI</span>
            </div>

            {/* The 2×2 Viewport Canvas */}
            <div className="my-auto relative flex flex-col items-center">
              
              {/* Outer Safe Margin Guide Indicator */}
              <div className="p-3 border border-neutral-700 rounded-3xl bg-neutral-950/80 shadow-2xl relative">
                
                {/* 2×2 / 2×3 Aspect Container */}
                <div
                  className={`w-64 sm:w-72 aspect-square bg-neutral-900 rounded-2xl overflow-hidden relative border-2 border-amber-400/80 shadow-inner group`}
                >
                  {currentStudent.photoUrl ? (
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.name}
                      className="w-full h-full object-cover transition-transform duration-75"
                      style={{
                        transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-900 text-amber-300">
                      <Camera size={36} className="text-amber-400/80 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold font-heading uppercase tracking-wider">
                        NO 2×2 PHOTO ON FILE
                      </p>
                      <p className="text-xs text-neutral-400 mt-1 max-w-[180px]">
                        Upload a photo in the batch uploader or assign from database bookings.
                      </p>
                    </div>
                  )}

                  {/* Alignment & Eye-level Overlays (rule of thirds & center crosshair) */}
                  {showGuides && currentStudent.photoUrl && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Eye-level indicator line (top 1/3) */}
                      <div className="absolute top-1/3 inset-x-0 border-b border-dashed border-cyan-400/60 flex justify-end pr-2">
                        <span className="text-[10px] font-mono text-cyan-300 bg-neutral-900/80 px-1 rounded -translate-y-1/2">
                          EYE LEVEL
                        </span>
                      </div>
                      {/* Vertical Center Axis */}
                      <div className="absolute inset-y-0 left-1/2 border-r border-dashed border-cyan-400/60" />
                      {/* Chin clearance line (bottom 1/3) */}
                      <div className="absolute top-2/3 inset-x-0 border-b border-dashed border-cyan-400/40" />
                    </div>
                  )}

                  {/* 2×2 Authentic Physical Cut Mark Watermark */}
                  <div className="absolute bottom-0 inset-x-0 bg-neutral-950/90 py-1 px-2.5 flex items-center justify-between text-[10px] font-mono text-amber-300 border-t border-amber-400/30">
                    <span>E-KODAK OFFICIAL 2×2</span>
                    <span>300 DPI ARCHIVAL</span>
                  </div>
                </div>

                {/* Candidate Name Tag on Print Output */}
                <div className="mt-3 text-center">
                  <h4 className="font-heading font-bold text-sm text-white">
                    {currentStudent.name}
                  </h4>
                  <p className="text-[11px] text-amber-300/80 font-mono">
                    {currentStudent.studentId ? `ID: ${currentStudent.studentId} · ` : ''}
                    {currentStudent.degree || currentStudent.credentials || 'Academic Graduate'}
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Viewport Adjusters Bar */}
            <div className="w-full max-w-md bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 flex flex-col gap-2 shrink-0 z-20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1">
                  <ZoomIn size={13} className="text-amber-400" />
                  <span>Zoom Framing: {(zoom * 100).toFixed(0)}%</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuides(!showGuides)}
                  className={`text-xs font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    showGuides ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-neutral-500'
                  }`}
                >
                  {showGuides ? 'Hide Eye Guides' : 'Show Eye Guides'}
                </button>
              </div>

              {/* Zoom Slider */}
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => {
                  setZoom(parseFloat(e.target.value));
                  handleApplySpecs();
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />

              {/* Pan Horizontal & Vertical Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-800 text-xs text-neutral-400 font-mono">
                <div>
                  <label className="block mb-0.5">Horizontal Pan: {panX}%</label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={panX}
                    onChange={(e) => {
                      setPanX(parseInt(e.target.value, 10));
                      handleApplySpecs();
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block mb-0.5">Vertical Pan: {panY}%</label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={panY}
                    onChange={(e) => {
                      setPanY(parseInt(e.target.value, 10));
                      handleApplySpecs();
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2">
            {onOpenFullEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullEditor(currentStudent);
                }}
                className="px-3.5 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders size={13} />
                <span>Open Full Student Editor</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Confirm 2×2 Crop &amp; Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

TwoByTwoRollModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  student: PropTypes.object,
  students: PropTypes.array,
  onUpdateStudentPhotoSpecs: PropTypes.func,
  onOpenFullEditor: PropTypes.func,
};
