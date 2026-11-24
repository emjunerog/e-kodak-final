import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  Camera,
  CameraOff,
  Search,
  Printer,
  Users,
  Crop,
  Sliders,
  Pencil,
  Trash2,
  X,
  Check,
  Palette,
  BookOpen,
} from 'lucide-react';
import YearbookAdminToolbar from '../../components/admin/yearbook/YearbookAdminToolbar';
import YearbookToolsSidebar from '../../components/admin/yearbook/YearbookToolsSidebar';
import YearbookFlipbook from '../../components/admin/yearbook/YearbookFlipbook';
import YearbookPrintBook from '../../components/admin/yearbook/YearbookPrintBook';
import YearbookCustomTemplateStudio from '../../components/admin/yearbook/YearbookCustomTemplateStudio';
import IndividualStudentEditorModal from '../../components/admin/yearbook/IndividualStudentEditorModal';
import BatchPhotoUploadModal from '../../components/admin/yearbook/BatchPhotoUploadModal';
import TwoByTwoRollModal from '../../components/admin/yearbook/TwoByTwoRollModal';
import YearbookExportModal from '../../components/admin/yearbook/YearbookExportModal';
import { OFFICIAL_SCHOOL_LOGOS } from '../../components/booking/SchoolLogo';
import {
  DEFAULT_CUSTOM_TEMPLATE,
  loadStoredConfig,
  saveStoredConfig,
  loadStoredStudents,
  saveStoredStudents,
  fetchYearbookStudents,
  validateStudentRecord,
  normalizeSchoolName,
  detectSchools,
  detectSections,
  detectDuplicateRecords,
  dedupeStudents,
  runPreflightQualityCheck,
  listSavedTemplatePresets,
  saveCustomTemplatePreset,
  deleteCustomTemplatePreset,
} from '../../services/yearbookService';

const CEBU_CREST_STRIP = ['ctu', 'usc', 'uc', 'citu', 'cnu', 'usjr', 'upcebu', 'swu', 'cdu', 'velez'];

const LAUNCHPAD_PORTRAIT_FRAMES = [
  {
    src: '/images/brochure/grad/toga-cap-pose.jpg',
    alt: 'Graduation Cap Pose Portrait',
    imgClass: 'w-full h-full object-cover object-[50%_15%] scale-[1.06] transition-transform duration-700 ease-out group-hover:scale-[1.11]',
  },
  {
    src: '/images/brochure/grad/toga-hood-portrait.jpg',
    alt: 'Academic Hood Studio Portrait',
    imgClass: 'w-full h-full object-cover object-[50%_14%] scale-[1.08] transition-transform duration-700 ease-out group-hover:scale-[1.13]',
  },
  {
    src: '/images/brochure/grad/toga-cap-formal.jpg',
    alt: 'Formal Toga Portrait',
    imgClass: 'w-full h-full object-cover object-[50%_14%] transition-transform duration-700 ease-out group-hover:scale-[1.06]',
  },
  {
    src: '/images/brochure/grad/filipiniana-portrait.jpg',
    alt: 'Filipiniana Graduation Portrait',
    imgClass: 'w-full h-full object-cover object-[50%_14%] scale-[1.05] transition-transform duration-700 ease-out group-hover:scale-[1.10]',
  },
];

function getPrintCss() {
  return `
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body * {
        visibility: hidden !important;
      }
      #yearbook-print-book,
      #yearbook-print-book * {
        visibility: visible !important;
      }
      #yearbook-print-book {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #yearbook-print-book .yb-screen-label,
      #yearbook-print-book .yb-no-print {
        display: none !important;
      }
      #yearbook-print-book .yb-print-page {
        width: 210mm !important;
        height: 297mm !important;
        page-break-after: always !important;
        break-after: page !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
      #yearbook-print-book .yb-print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      #yearbook-print-book .yb-sheet {
        width: 210mm !important;
        height: 297mm !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }
    }

    .yb-sheet {
      width: 100%;
      max-width: 794px;
      aspect-ratio: 210 / 297;
      margin: 0 auto;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.14);
      border: 1px solid rgba(23, 23, 23, 0.08);
      background: #ffffff;
    }
    .yb-screen-label {
      max-width: 794px;
      margin: 0 auto 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #737373;
    }
  `;
}

export default function AdminYearbookGenerator() {
  const [config, setConfig] = useState(() => loadStoredConfig());
  const [rawStudents, setRawStudents] = useState(() => {
    const stored = loadStoredStudents();
    return Array.isArray(stored) ? stored : [];
  });
  const students = useMemo(
    () => (Array.isArray(rawStudents) ? rawStudents : (Array.isArray(rawStudents?.students) ? rawStudents.students : [])),
    [rawStudents]
  );
  const setStudents = useCallback((nextOrUpdater) => {
    setRawStudents((prev) => {
      const prevArr = Array.isArray(prev)
        ? prev
        : (Array.isArray(prev?.students) ? prev.students : []);
      const resolved = typeof nextOrUpdater === 'function' ? nextOrUpdater(prevArr) : nextOrUpdater;
      if (Array.isArray(resolved)) return resolved;
      if (resolved && Array.isArray(resolved.students)) return resolved.students;
      return [];
    });
  }, []);
  const [presets, setPresets] = useState(() => listSavedTemplatePresets());
  const [viewMode, setViewMode] = useState('book'); // 'book' | 'print' | 'design' | 'roster' | 'twobytwo'
  const [showToolsSidebar, setShowToolsSidebar] = useState(true);
  const [isDetectingDB, setIsDetectingDB] = useState(false);

  const [selectedSchoolState, setSelectedSchool] = useState(() => {
    const stored = loadStoredConfig().targetSchool;
    if (stored) return stored;
    const storedStudents = loadStoredStudents();
    return detectSchools(Array.isArray(storedStudents) ? storedStudents : [])[0]?.name || '';
  });
  const [selectedSection, setSelectedSection] = useState(() => loadStoredConfig().targetSection || 'ALL');

  // Roster filters
  const [filterSection, setFilterSection] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  const [searchRoster, setSearchRoster] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  // Status banner
  const [notice, setNotice] = useState(null);

  // Modals / Drawers
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBatchPhotoOpen, setIsBatchPhotoOpen] = useState(false);
  const [isTwoByTwoOpen, setIsTwoByTwoOpen] = useState(false);
  const [twoByTwoStudent, setTwoByTwoStudent] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const showNotice = (text, type = 'success') => {
    setNotice({ text, type });
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const availableSchools = useMemo(() => detectSchools(students), [students]);
  const selectedSchool = selectedSchoolState || availableSchools[0]?.name || '';

  const schoolStudents = useMemo(() => {
    if (!selectedSchool) return students;
    const targetNorm = normalizeSchoolName(selectedSchool);
    return students.filter((s) => normalizeSchoolName(s.school) === targetNorm);
  }, [students, selectedSchool]);

  const availableSections = useMemo(
    () => detectSections(schoolStudents),
    [schoolStudents]
  );

  const scopedStudents = useMemo(() => {
    if (!selectedSection || selectedSection === 'ALL') return schoolStudents;
    return schoolStudents.filter((s) => (s.section || '').trim() === selectedSection);
  }, [schoolStudents, selectedSection]);

  const bookStudents = useMemo(
    () =>
      scopedStudents.filter(
        (s) => (s.validation || validateStudentRecord(s)).valid
      ),
    [scopedStudents]
  );

  const excludedInvalidCount = Math.max(0, scopedStudents.length - bookStudents.length);
  const otherSchoolCount = Math.max(0, students.length - schoolStudents.length);

  const duplicates = useMemo(() => detectDuplicateRecords(students), [students]);
  const duplicateCount = duplicates.length;

  const preflight = useMemo(
    () =>
      runPreflightQualityCheck(config, bookStudents, {
        excludedInvalidCount,
        otherSchoolCount,
      }),
    [config, bookStudents, excludedInvalidCount, otherSchoolCount]
  );

  const currentTheme = config.templateId || 'classic';

  // Roster sorting & search
  const filteredStudents = useMemo(() => {
    let list = [...scopedStudents];
    if (filterSection !== 'ALL') {
      list = list.filter((s) => (s.section || '') === filterSection);
    }
    if (searchRoster.trim()) {
      const q = searchRoster.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.studentId || '').toLowerCase().includes(q) ||
          (s.section || '').toLowerCase().includes(q) ||
          (s.degree || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'officers-first') {
      list.sort((a, b) => Number(Boolean(b.isOfficer)) - Number(Boolean(a.isOfficer)));
    } else if (sortBy === 'completeness') {
      list.sort((a, b) => (b.completeness || 0) - (a.completeness || 0));
    }
    return list;
  }, [scopedStudents, filterSection, searchRoster, sortBy]);

  // ── Handlers ────────────────────────────────────────────────
  const handleUpdateConfig = (patch) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        ...patch,
        customTemplate: patch.customTemplate
          ? { ...(prev.customTemplate || DEFAULT_CUSTOM_TEMPLATE), ...patch.customTemplate }
          : (prev.customTemplate || DEFAULT_CUSTOM_TEMPLATE),
      };
      saveStoredConfig(next);
      return next;
    });
  };

  const handleSelectSchool = (schoolName) => {
    setSelectedSchool(schoolName);
    setSelectedSection('ALL');
    setFilterSection('ALL');
    handleUpdateConfig({
      targetSchool: schoolName,
      targetSection: 'ALL',
      sectionName: '',
    });
  };

  const handleSelectSection = (sectionVal) => {
    const clean = sectionVal || 'ALL';
    setSelectedSection(clean);
    setFilterSection(clean === 'ALL' ? 'ALL' : clean);
    handleUpdateConfig({
      targetSection: clean,
      sectionName: clean === 'ALL' ? '' : clean,
    });
  };

  const handleSelectTheme = (themeId) => {
    handleUpdateConfig({ templateId: themeId });
  };

  const handleAutoDetectDB = async () => {
    setIsDetectingDB(true);
    try {
      const dbRecords = await fetchYearbookStudents();
      const { students: cleaned } = dedupeStudents(Array.isArray(dbRecords) ? dbRecords : []);
      setStudents(cleaned);
      saveStoredStudents(cleaned);

      const detected = detectSchools(cleaned);
      if (detected.length > 0 && (!selectedSchool || !detected.some((d) => d.name === selectedSchool))) {
        const firstSchool = detected[0].name;
        setSelectedSchool(firstSchool);
        setSelectedSection('ALL');
        handleUpdateConfig({ targetSchool: firstSchool, targetSection: 'ALL' });
      }
      showNotice(
        cleaned.length > 0
          ? `Synced ${cleaned.length} candidate record${cleaned.length === 1 ? '' : 's'} across ${detected.length || 1} school batch(es).`
          : 'No academic or sectional masterlist orders found in Supabase yet.',
        cleaned.length > 0 ? 'success' : 'info'
      );
    } catch (err) {
      showNotice(err?.message || 'Failed to sync bookings from Supabase.', 'error');
    } finally {
      setIsDetectingDB(false);
    }
  };

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (stu) => {
    setEditingStudent(stu);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (saved) => {
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      const next = exists
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [saved, ...prev];
      saveStoredStudents(next);
      return next;
    });
    if (saved.school && !selectedSchool) {
      setSelectedSchool(saved.school);
    }
    showNotice(`Saved ${saved.name || 'student record'}.`);
  };

  const handleDeleteStudent = (id) => {
    setStudents((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStoredStudents(next);
      return next;
    });
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showNotice('Candidate removed from studio roster.', 'info');
  };

  const handleApplyBatchPhotos = (photoUpdates) => {
    const count = Object.keys(photoUpdates || {}).length;
    if (count === 0) return;
    setStudents((prev) => {
      const next = prev.map((stu) => {
        if (!photoUpdates[stu.id]) return stu;
        const updated = { ...stu, photoUrl: photoUpdates[stu.id] };
        updated.validation = validateStudentRecord(updated);
        return updated;
      });
      saveStoredStudents(next);
      return next;
    });
    showNotice(`Matched ${count} portrait${count === 1 ? '' : 's'} to candidates.`);
  };

  const handleOpenTwoByTwoForStudent = (stu) => {
    setTwoByTwoStudent(stu);
    setIsTwoByTwoOpen(true);
  };

  const handleUpdatePhotoSpecs = (studentId, specs) => {
    setStudents((prev) => {
      const next = prev.map((stu) =>
        stu.id === studentId ? { ...stu, photoSpecs: { ...(stu.photoSpecs || {}), ...specs } } : stu
      );
      saveStoredStudents(next);
      return next;
    });
  };

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleBulkDeleteSelected = () => {
    if (selectedStudentIds.size === 0) return;
    setStudents((prev) => {
      const next = prev.filter((s) => !selectedStudentIds.has(s.id));
      saveStoredStudents(next);
      return next;
    });
    setSelectedStudentIds(new Set());
    showNotice('Removed selected candidates from roster.', 'info');
  };

  // Saved Custom Template Presets
  const handleSavePreset = (name) => {
    const updated = saveCustomTemplatePreset(name, config.customTemplate, config);
    setPresets(updated);
    showNotice(`Saved template preset "${name}".`);
  };

  const handleApplyPreset = (preset) => {
    if (!preset) return;
    handleUpdateConfig({
      templateId: 'custom',
      customTemplate: preset.customTemplate || DEFAULT_CUSTOM_TEMPLATE,
      coverBgUrl: preset.coverBgUrl ?? config.coverBgUrl,
      coverLogoUrl: preset.coverLogoUrl ?? config.coverLogoUrl,
      coverColor: preset.coverColor || config.coverColor,
    });
    showNotice(`Loaded template preset "${preset.name}".`);
  };

  const handleDeletePreset = (id) => {
    const updated = deleteCustomTemplatePreset(id);
    setPresets(updated);
  };

  const handleTriggerPrint = () => {
    setViewMode('print');
    setIsExportOpen(false);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div className="min-h-full w-full bg-[#f5f1ea] font-body">
      <style>{getPrintCss()}</style>

      {/* Flush-Joined Obsidian-Gold Studio Command Bar (zero gap under AdminHeader) */}
      <YearbookAdminToolbar
        selectedSchool={availableSchools.length > 0 ? selectedSchool : ''}
        selectedSection={selectedSection}
        viewMode={viewMode}
        onChangeView={setViewMode}
        onAutoDetectDB={handleAutoDetectDB}
        isDetectingDB={isDetectingDB}
        onOpenExport={() => setIsExportOpen(true)}
        showToolsSidebar={showToolsSidebar}
        onToggleToolsSidebar={() => setShowToolsSidebar((prev) => !prev)}
      />

      <div className="w-full p-2 sm:p-2.5 flex flex-col gap-2.5 min-h-[calc(100dvh-142px)]">

        {/* Inline Status Notice */}
        {notice && (
          <div
            className={`px-4 py-2 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs ${notice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : notice.type === 'info'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Full-Width Studio Layout: Fluid Canvas + Collapsible Frosty Tool Rail */}
        <div
          className={`relative grid grid-cols-1 gap-2.5 items-stretch flex-1 min-h-0 ${showToolsSidebar ? 'lg:grid-cols-[minmax(0,1fr)_286px] xl:grid-cols-[minmax(0,1fr)_298px]' : ''
            }`}
        >
          {/* Primary Canvas */}
          <main className="min-w-0 flex flex-col gap-2.5 min-h-0">
            {/* ── EMPTY LAUNCHPAD (fits cleanly inside 100dvh at 100% zoom with zero extra bottom overflow) ── */}
            {students.length === 0 && !isDetectingDB && viewMode !== 'design' && (
              <section className="relative overflow-hidden rounded-2xl bg-white border border-[#c9a96e]/35 shadow-lg shadow-amber-950/5 flex-1 flex flex-col min-h-0 lg:max-h-[calc(100dvh-160px)]">
                <div className="grid grid-cols-1 xl:grid-cols-12 flex-1 min-h-0">
                  {/* Left Story + Quick Actions */}
                  <div className="xl:col-span-7 px-6 py-6 sm:px-8 sm:py-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="space-y-3 max-w-2xl">
                      <h2 className="font-heading text-2xl sm:text-3xl xl:text-[36px] font-bold text-neutral-950 tracking-tight leading-[1.15]">
                        Turn school section orders &amp; Canva artwork into{' '}
                        <span className="italic font-semibold bg-gradient-to-r from-[#b8862d] via-[#d4af37] to-[#9a6b16] bg-clip-text text-transparent">
                          print-ready A4 yearbooks.
                        </span>
                      </h2>

                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-lg mx-auto">
                        Sync graduation bookings or masterlists from Supabase, import a class CSV roster, match 2×2 studio portraits, or upload your own Canva cover and page background inside <strong className="text-neutral-900 font-semibold">My Design Studio</strong>.
                      </p>
                    </div>

                    {/* Primary Action Deck */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleAutoDetectDB}
                        className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <Database size={14} className="text-amber-400" />
                        <span>Scan Database Bookings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTheme('custom');
                          setViewMode('design');
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b58b28] hover:from-[#e0bc46] hover:to-[#c4972f] text-neutral-950 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Palette size={14} />
                        <span>Use My Canva / Design Template</span>
                      </button>
                    </div>

                    {/* Partner Cebu Schools Crest Strip */}
                    <div className="pt-4 border-t border-neutral-100 w-full max-w-lg space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 font-bold">
                        Supported Schools
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {CEBU_CREST_STRIP.map((code) => {
                          const crest = OFFICIAL_SCHOOL_LOGOS[code];
                          if (!crest) return null;
                          return (
                            <div
                              key={code}
                              title={crest.label}
                              className="w-8 h-8 rounded-lg border border-neutral-200 bg-neutral-50/80 p-1 flex items-center justify-center"
                            >
                              <img src={crest.src} alt={crest.short} className="w-full h-full object-contain" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Visual Studio Mosaic (2x2 mahogany wood & ivory mat crystal gallery frames) */}
                  <div className="xl:col-span-5 bg-gradient-to-br from-[#161311] via-[#1f1914] to-[#110e0c] p-3 flex flex-col min-h-[420px] xl:min-h-0">
                    <div className="grid grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 flex-1 min-h-0">
                      {LAUNCHPAD_PORTRAIT_FRAMES.map((frame) => (
                        <div
                          key={frame.src}
                          className="group relative min-h-0 flex flex-col p-[7px] rounded-sm bg-gradient-to-br from-[#4b2718] via-[#2e160d] to-[#3f2014] shadow-[0_12px_26px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,215,170,0.22),inset_0_-2px_4px_rgba(0,0,0,0.75)] ring-1 ring-[#1a0d08]"
                        >
                          {/* Outer wood grain rib texture */}
                          <div className="flex-1 min-h-0 flex flex-col p-[1.5px] bg-[#1a0d08]">
                            {/* Cream archival mat board (passe-partout) */}
                            <div className="flex-1 min-h-0 flex flex-col p-[7px] sm:p-[8px] bg-[#f6efe3] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
                              {/* Beveled inner mat cutout window */}
                              <div className="relative flex-1 min-h-0 overflow-hidden bg-neutral-950 border border-[#cfc4ae] shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
                                <img
                                  src={frame.src}
                                  alt={frame.alt}
                                  className={frame.imgClass}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── VIEW: MY DESIGN TEMPLATE STUDIO (CANVA / ARTWORK + LIVE TWEAKER) ── */}
            {viewMode === 'design' && (
              <YearbookCustomTemplateStudio
                config={config}
                students={bookStudents.length > 0 ? bookStudents : scopedStudents}
                onUpdateConfig={handleUpdateConfig}
                presets={presets}
                onSavePreset={handleSavePreset}
                onApplyPreset={handleApplyPreset}
                onDeletePreset={handleDeletePreset}
                onSwitchToCustomTheme={() => handleSelectTheme('custom')}
                onOpenPrintPreview={() => setViewMode('print')}
              />
            )}

            {/* ── VIEW: PDF PAGES (A4 PRINT ORDER) ──────────────────── */}
            {viewMode === 'print' && (students.length > 0 || viewMode === 'print') && (
              <section className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                      <Printer size={18} className="text-amber-600" />
                      <span>PDF Pages — A4 Print Order</span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {selectedSchool || 'No school selected'}
                      {selectedSection && selectedSection !== 'ALL' ? ` · ${selectedSection}` : ''}
                      {' · '}Cover → Dedication → Section Opener → Student Grid → Back Cover
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentTheme === 'custom' && (
                      <button
                        type="button"
                        onClick={() => setViewMode('design')}
                        className="px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 cursor-pointer"
                      >
                        <Palette size={13} />
                        <span>Tweak My Design</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsExportOpen(true)}
                      className="px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer size={13} className="text-amber-400" />
                      <span>Export A4 PDF</span>
                    </button>
                  </div>
                </div>

                {bookStudents.length > 0 ? (
                  <YearbookPrintBook
                    students={bookStudents}
                    config={config}
                    theme={currentTheme}
                    onSelectStudent={handleOpenEditStudent}
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl">
                    No valid candidate records for {selectedSchool || 'this selection'} yet. Sync DB batches, import CSV, or fix incomplete entries in Roster.
                  </div>
                )}
              </section>
            )}

            {/* ── VIEW: 3D FLIPPABLE BOOK PREVIEW ──────────────────── */}
            {viewMode === 'book' && bookStudents.length > 0 && (
              <section className="bg-white p-4 sm:p-6 rounded-3xl border border-[#c9a96e]/30 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} className="text-amber-600" />
                    <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">
                      3D Interactive Flipbook · {selectedSchool}
                      {selectedSection && selectedSection !== 'ALL' ? ` · ${selectedSection}` : ''} ({bookStudents.length})
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('design')}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                    >
                      Customize Layout
                    </button>
                    <span className="text-[11px] text-neutral-400 hidden sm:inline">
                      · Switch to A4 Sheets for final print
                    </span>
                  </div>
                </div>

                <YearbookFlipbook
                  students={bookStudents}
                  config={config}
                  theme={currentTheme}
                  onEditStudent={handleOpenEditStudent}
                />
              </section>
            )}

            {/* ── VIEW: 2×2 PHOTO CHECK ──────────────────────────────── */}
            {viewMode === 'twobytwo' && students.length > 0 && (
              <section className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                      <Crop size={18} className="text-amber-600" />
                      <span>2×2 Portrait Verification</span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Click any student portrait to adjust 2×2 crop, zoom, or pan before A4 export.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchPhotoOpen(true)}
                      className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={13} className="text-amber-600" />
                      <span>Batch Match Photos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoByTwoStudent(bookStudents[0] || scopedStudents[0] || null);
                        setIsTwoByTwoOpen(true);
                      }}
                      className="px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
                    >
                      <Sliders size={13} className="text-amber-400" />
                      <span>Open Framing Studio</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {filteredStudents.map((stu) => (
                    <div
                      key={stu.id}
                      onClick={() => handleOpenTwoByTwoForStudent(stu)}
                      className="group cursor-pointer p-2.5 rounded-2xl border border-neutral-200 hover:border-amber-500 hover:shadow-lg transition-all duration-200 bg-neutral-50/50 flex flex-col items-center text-center relative"
                    >
                      <div className="w-full aspect-square rounded-xl bg-neutral-900 overflow-hidden relative ring-1 ring-neutral-300 group-hover:ring-amber-500 mb-2 shadow-2xs">
                        {stu.photoUrl ? (
                          <img
                            src={stu.photoUrl}
                            alt={stu.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            style={{
                              transform: `scale(${stu.photoSpecs?.zoom || 1}) translate(${stu.photoSpecs?.panX || 0}%, ${stu.photoSpecs?.panY || 0}%)`,
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800 text-amber-300/80 text-[10px] font-mono p-1">
                            <CameraOff size={16} className="mb-1" />
                            <span>NO PHOTO</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-neutral-950/80 text-amber-300 text-[9px] font-mono text-center py-0.5">
                          2.0 × 2.0 INCH
                        </div>
                      </div>

                      <p className="text-xs font-bold text-neutral-900 truncate w-full group-hover:text-amber-800">
                        {stu.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono truncate w-full">
                        {stu.studentId || 'No ID'}
                      </p>

                      {stu.photoUrl ? (
                        <span className="mt-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                          READY
                        </span>
                      ) : (
                        <span className="mt-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold font-mono">
                          MISSING
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── VIEW: ROSTER ──────────────────────────────────────── */}
            {viewMode === 'roster' && students.length > 0 && (
              <section className="relative overflow-hidden rounded-3xl border border-[#c9a96e]/35 bg-white/95 shadow-xl shadow-amber-950/5 font-body">
                <div className="p-4 sm:p-6 border-b border-[#c9a96e]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-b from-[#faf7f2]/60 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shrink-0">
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-neutral-900 tracking-tight">
                        Roster — {selectedSchool || 'All Schools'}
                        {selectedSection !== 'ALL' ? ` · ${selectedSection}` : ''}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {bookStudents.length} in book · {excludedInvalidCount} incomplete · {otherSchoolCount} other schools · {duplicateCount} duplicates
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedStudentIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteSelected}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Delete ({selectedStudentIds.size})</span>
                      </button>
                    )}

                    {availableSections.length > 0 && (
                      <select
                        value={filterSection}
                        onChange={(e) => setFilterSection(e.target.value)}
                        className="py-1.5 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none focus:border-amber-400"
                      >
                        <option value="ALL">All Sections</option>
                        {availableSections.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="py-1.5 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none focus:border-amber-400"
                    >
                      <option value="name-asc">Alphabetical (A–Z)</option>
                      <option value="officers-first">Officers First</option>
                      <option value="completeness">Readiness Score</option>
                    </select>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-neutral-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchRoster}
                        onChange={(e) => setSearchRoster(e.target.value)}
                        placeholder="Search students..."
                        className="pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-400 outline-none w-48"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#faf7f2] border-b border-[#c9a96e]/25">
                      <tr className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                            onChange={handleSelectAll}
                            className="rounded accent-amber-600 cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-4">Photo</th>
                        <th className="py-3.5 px-4">Student &amp; ID</th>
                        <th className="py-3.5 px-4">School</th>
                        <th className="py-3.5 px-4">Section &amp; Program</th>
                        <th className="py-3.5 px-4">Role / Honors</th>
                        <th className="py-3.5 px-4">Motto</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                      {filteredStudents.map((stu) => {
                        const isChecked = selectedStudentIds.has(stu.id);
                        const validation = stu.validation || validateStudentRecord(stu);
                        return (
                          <tr
                            key={stu.id}
                            className={`hover:bg-neutral-50/70 transition-colors ${validation.valid ? '' : 'bg-rose-50/40'}`}
                          >
                            <td className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectStudent(stu.id)}
                                className="rounded accent-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <div
                                onClick={() => handleOpenTwoByTwoForStudent(stu)}
                                className="w-10 h-10 rounded-lg bg-neutral-900 overflow-hidden ring-1 ring-amber-400/50 relative cursor-pointer group"
                              >
                                {stu.photoUrl ? (
                                  <img src={stu.photoUrl} alt={stu.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] text-amber-300 font-mono">
                                    N/A
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <p className="font-bold text-neutral-900">
                                {stu.name || <span className="text-rose-600">Missing name</span>}
                              </p>
                              <p className="text-[11px] text-neutral-400 font-mono">
                                {stu.studentId ? `ID: ${stu.studentId}` : <span className="text-rose-600">Missing ID</span>}
                              </p>
                            </td>
                            <td className="py-2.5 px-4">
                              <p className="font-semibold text-neutral-800 truncate max-w-[140px]">
                                {stu.school || <span className="text-rose-600">Missing</span>}
                              </p>
                            </td>
                            <td className="py-2.5 px-4">
                              <p className="font-semibold text-neutral-800">
                                {stu.section || <span className="text-rose-600">Missing section</span>}
                              </p>
                              {(stu.degree || stu.credentials) && (
                                <p className="text-[11px] text-neutral-400 truncate max-w-[140px]">
                                  {stu.degree || stu.credentials}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              {stu.isOfficer ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300 uppercase">
                                  {stu.role}
                                </span>
                              ) : (
                                <span className="text-neutral-500 text-[11px]">Student</span>
                              )}
                              {stu.honors && (
                                <p className="text-[11px] text-amber-700 font-semibold mt-0.5 truncate max-w-[120px]">
                                  {stu.honors}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-4 max-w-[180px] truncate italic text-neutral-600 font-serif">
                              {stu.motto ? `"${stu.motto}"` : <span className="text-neutral-300 not-italic">—</span>}
                            </td>
                            <td className="py-2.5 px-4">
                              {validation.valid ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Ready
                                </span>
                              ) : (
                                <span
                                  title={validation.missing.join(', ')}
                                  className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold"
                                >
                                  Needs Fix
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStudent(stu)}
                                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 cursor-pointer"
                                  title="Edit Student"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(stu.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>

          {/* Collapsible Frosty Tools Sidebar Rail */}
          {showToolsSidebar && (
            <div className="w-full min-h-0">
              <YearbookToolsSidebar
                viewMode={viewMode}
                onChangeView={setViewMode}
                onHideSidebar={() => setShowToolsSidebar(false)}
                selectedSchool={selectedSchool}
                availableSchools={availableSchools}
                onSelectSchool={handleSelectSchool}
                selectedSection={selectedSection}
                availableSections={availableSections}
                onSelectSection={handleSelectSection}
                totalStudentsCount={students.length}
                bookStudentsCount={bookStudents.length}
                excludedCount={excludedInvalidCount}
                onAutoDetectDB={handleAutoDetectDB}
                isDetectingDB={isDetectingDB}
                onOpenAddStudent={handleOpenAddStudent}
                onOpenBatchPhotoUpload={() => setIsBatchPhotoOpen(true)}
                config={config}
                onUpdateConfig={handleUpdateConfig}
                onOpenConfigModal={() => setIsConfigModalOpen(true)}
                onOpenExport={() => setIsExportOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Publication Details / Dedication Modal ─────────────────── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div>
                <h2 className="font-heading text-base font-bold text-neutral-900">
                  Book &amp; Dedication Details
                </h2>
                <p className="text-xs text-neutral-500">
                  Optional text rendered on covers, opener, and the Principal/Adviser message page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-500 mb-1">
                  Yearbook Title
                </label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => handleUpdateConfig({ title: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-neutral-500 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={config.academicYear || ''}
                    onChange={(e) => handleUpdateConfig({ academicYear: e.target.value })}
                    placeholder="e.g. 2025 - 2026"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-neutral-500 mb-1">
                    Section / Batch Label
                  </label>
                  <input
                    type="text"
                    value={config.sectionName || ''}
                    onChange={(e) => handleUpdateConfig({ sectionName: e.target.value })}
                    placeholder="e.g. 12-ST. THOMAS"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-neutral-500 mb-1">
                    Signer Name (Adviser / Dean)
                  </label>
                  <input
                    type="text"
                    value={config.principalName || ''}
                    onChange={(e) => handleUpdateConfig({ principalName: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-neutral-500 mb-1">
                    Signer Title
                  </label>
                  <input
                    type="text"
                    value={config.principalTitle || ''}
                    onChange={(e) => handleUpdateConfig({ principalTitle: e.target.value })}
                    placeholder="e.g. College Dean"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-500 mb-1">
                  Dedication / Commencement Message
                </label>
                <textarea
                  rows={4}
                  value={config.principalMessage || ''}
                  onChange={(e) => handleUpdateConfig({ principalMessage: e.target.value })}
                  placeholder="Write the message to print inside the opening dedication sheet..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals & Drawers ──────────────────────────────────────── */}
      <IndividualStudentEditorModal
        isOpen={isStudentModalOpen}
        student={editingStudent}
        defaultSchool={selectedSchool}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
      />

      <BatchPhotoUploadModal
        isOpen={isBatchPhotoOpen}
        onClose={() => setIsBatchPhotoOpen(false)}
        students={students}
        onApplyPhotos={handleApplyBatchPhotos}
      />

      <TwoByTwoRollModal
        isOpen={isTwoByTwoOpen}
        onClose={() => setIsTwoByTwoOpen(false)}
        student={twoByTwoStudent}
        students={scopedStudents.length > 0 ? scopedStudents : students}
        onUpdateStudentPhotoSpecs={handleUpdatePhotoSpecs}
        onOpenFullEditor={(stu) => {
          setIsTwoByTwoOpen(false);
          handleOpenEditStudent(stu);
        }}
      />

      <YearbookExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
        students={bookStudents}
        preflight={preflight}
        onTriggerPrint={handleTriggerPrint}
      />
    </div>
  );
}
