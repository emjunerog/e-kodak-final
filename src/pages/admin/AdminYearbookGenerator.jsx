import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Camera,
  Database,
  Users,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  Crop,
  Printer,
  Plus,
  Sliders,
  CameraOff,
  Info,
} from 'lucide-react';
import YearbookAdminToolbar from '../../components/admin/yearbook/YearbookAdminToolbar';
import YearbookToolsSidebar from '../../components/admin/yearbook/YearbookToolsSidebar';
import YearbookFlipbook from '../../components/admin/yearbook/YearbookFlipbook';
import YearbookPrintBook from '../../components/admin/yearbook/YearbookPrintBook';
import YearbookCoverEditorModal from '../../components/admin/yearbook/YearbookCoverEditorModal';
import IndividualStudentEditorModal from '../../components/admin/yearbook/IndividualStudentEditorModal';
import YearbookExportModal from '../../components/admin/yearbook/YearbookExportModal';
import BatchPhotoUploadModal from '../../components/admin/yearbook/BatchPhotoUploadModal';
import TwoByTwoRollModal from '../../components/admin/yearbook/TwoByTwoRollModal';
import CompletenessAuditDrawer from '../../components/admin/yearbook/CompletenessAuditDrawer';
import {
  fetchEligibleAcademicStudents,
  saveStoredStudents,
  loadStoredProject,
  saveStoredProject,
  runPreflightQualityCheck,
  detectDuplicateRecords,
  dedupeStudents,
  detectSchools,
  validateStudentRecord,
  normalizeSchoolName,
  getStudentPageCount,
} from '../../services/yearbookService';

export default function AdminYearbookGenerator() {
  const [students, setStudents] = useState([]);
  const [config, setConfig] = useState(loadStoredProject());
  const [currentTheme, setCurrentTheme] = useState(config.templateId || 'classic');
  // 'print' is the primary workspace (what gets exported to PDF).
  // 'book' remains as an optional 3D preview.
  const [viewMode, setViewMode] = useState('book'); // 'book' | 'print' | 'twobytwo' | 'roster'
  const [isDetectingDB, setIsDetectingDB] = useState(false);
  // One school per book — the generator only includes records from this school.
  const [selectedSchool, setSelectedSchool] = useState(config.targetSchool || '');

  // Modals
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCoverEditorOpen, setIsCoverEditorOpen] = useState(false);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [isTwoByTwoOpen, setIsTwoByTwoOpen] = useState(false);
  const [twoByTwoStudent, setTwoByTwoStudent] = useState(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Filters & Sorting
  const [searchRoster, setSearchRoster] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc' | 'officers-first' | 'completeness'
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial load: fetch records, drop duplicates, scope to one school
  useEffect(() => {
    async function init() {
      setIsDetectingDB(true);
      const loaded = await fetchEligibleAcademicStudents();
      const { students: deduped, removed } = dedupeStudents(loaded);
      setStudents(deduped);
      setSelectedStudentIds(new Set(deduped.map((s) => s.id)));
      resolveSchool(deduped, config.targetSchool || '');
      setIsDetectingDB(false);
      if (removed.length > 0) {
        showToast(`Loaded ${deduped.length} records. ${removed.length} duplicate${removed.length === 1 ? '' : 's'} removed.`);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick which school this book covers: stored choice if still present,
  // otherwise the school with the most records. A blank cover school name
  // is filled in with the real school so the cover never shows a stale value.
  const resolveSchool = (records, preferred) => {
    const schools = detectSchools(records);
    const match = schools.find((s) => normalizeSchoolName(s.name) === normalizeSchoolName(preferred || ''));
    const chosen = match ? match.name : schools[0]?.name || '';
    setSelectedSchool(chosen);
    const updated = { ...config };
    let changed = false;
    if (chosen && chosen !== config.targetSchool) {
      updated.targetSchool = chosen;
      changed = true;
    }
    if (chosen && !(config.institutionName || '').trim()) {
      updated.institutionName = chosen;
      changed = true;
    }
    if (changed) {
      setConfig(updated);
      saveStoredProject(updated);
    }
  };

  const handleSelectSchool = (schoolName) => {
    setSelectedSchool(schoolName);
    const updated = { ...config, targetSchool: schoolName };
    if (schoolName && !(config.institutionName || '').trim()) {
      updated.institutionName = schoolName;
    }
    setConfig(updated);
    saveStoredProject(updated);
    showToast(schoolName ? `Book now covers ${schoolName} only.` : 'School scope cleared.');
  };

  // Update theme and persist config
  const handleSelectTheme = (themeId) => {
    setCurrentTheme(themeId);
    const updated = { ...config, templateId: themeId };
    setConfig(updated);
    saveStoredProject(updated);
    showToast(`Switched to ${themeId.toUpperCase()} template layout.`);
  };

  const handleUpdateConfig = (newConfig) => {
    setConfig(newConfig);
    saveStoredProject(newConfig);
  };

  // Sync / Auto-Detect from Database (de-duplicated, same-school scoped)
  const handleAutoDetectDB = async () => {
    setIsDetectingDB(true);
    try {
      const refreshed = await fetchEligibleAcademicStudents();
      const { students: deduped, removed } = dedupeStudents(refreshed);
      setStudents(deduped);
      setSelectedStudentIds(new Set(deduped.map((s) => s.id)));
      resolveSchool(deduped, selectedSchool || config.targetSchool || '');
      showToast(
        removed.length > 0
          ? `Synchronized ${deduped.length} records. ${removed.length} duplicate${removed.length === 1 ? '' : 's'} removed.`
          : `Synchronized ${deduped.length} student records from database.`
      );
    } catch (err) {
      console.error(err);
      showToast('Database scan completed with existing records.');
    } finally {
      setIsDetectingDB(false);
    }
  };

  // Remove duplicate records currently in the roster
  const handleRemoveDuplicates = () => {
    const { students: deduped, removed } = dedupeStudents(students);
    if (removed.length === 0) {
      showToast('No duplicates found.');
      return;
    }
    setStudents(deduped);
    saveStoredStudents(deduped.filter((s) => (s.id || '').startsWith('manual-')));
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      removed.forEach((r) => next.delete(r.id));
      return next;
    });
    showToast(`Removed ${removed.length} duplicate${removed.length === 1 ? '' : 's'}.`);
  };

  // Add / Edit Student Handlers — validated, same-school enforced
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditStudent = (student) => {
    setEditingStudent(student);
    setIsEditorOpen(true);
  };

  const handleOpenTwoByTwoForStudent = (student) => {
    setTwoByTwoStudent(student);
    setIsTwoByTwoOpen(true);
  };

  const handleDeleteStudent = (studentId) => {
    const updated = students.filter((s) => s.id !== studentId);
    setStudents(updated);
    saveStoredStudents(updated.filter((s) => (s.id || '').startsWith('manual-')));
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
    showToast('Student removed from publication roster.');
  };

  const handleSaveStudent = (savedStudent) => {
    // Validation: name, school, section, student ID, and photo are required.
    const check = validateStudentRecord(savedStudent);
    if (!check.valid) {
      showToast(`Cannot save: ${check.errors.join(', ')}.`);
      return;
    }
    // Same-school rule: records from other schools don't belong in this book.
    if (
      selectedSchool &&
      normalizeSchoolName(savedStudent.school) !== normalizeSchoolName(selectedSchool)
    ) {
      showToast(`This book covers ${selectedSchool} only. Record not saved.`);
      return;
    }
    // Duplicate rule: same name + ID + school already listed.
    const clash = students.some((s) => {
      if (editingStudent && s.id === editingStudent.id) return false;
      return (
        normalizeSchoolName(s.name) === normalizeSchoolName(savedStudent.name) &&
        (s.studentId || '').toLowerCase().trim() === (savedStudent.studentId || '').toLowerCase().trim() &&
        normalizeSchoolName(s.school) === normalizeSchoolName(savedStudent.school)
      );
    });
    if (clash) {
      showToast('Duplicate record — a student with the same name and ID is already listed.');
      return;
    }

    let updated;
    if (editingStudent) {
      const record = {
        ...savedStudent,
        completeness: savedStudent.completeness,
        validation: validateStudentRecord(savedStudent),
      };
      updated = students.map((s) => (s.id === savedStudent.id ? record : s));
      showToast(`Updated yearbook profile for ${savedStudent.name}`);
    } else {
      const record = {
        ...savedStudent,
        id: `manual-${Date.now()}`,
        isFromDatabase: false,
        validation: validateStudentRecord(savedStudent),
      };
      updated = [record, ...students];
      setSelectedStudentIds((prev) => new Set(prev).add(record.id));
      showToast(`Added ${savedStudent.name} to Yearbook Roster.`);
    }
    setStudents(updated);
    saveStoredStudents(updated.filter((s) => (s.id || '').startsWith('manual-')));
  };

  // Batch Photo Upload Handler
  const handleApplyBatchPhotos = (photoUpdates) => {
    const updated = students.map((stu) => {
      if (photoUpdates[stu.id]) {
        const next = { ...stu, photoUrl: photoUpdates[stu.id] };
        next.validation = validateStudentRecord(next);
        return next;
      }
      return stu;
    });

    setStudents(updated);
    saveStoredStudents(updated.filter((s) => (s.id || '').startsWith('manual-')));
    showToast(`Applied ${Object.keys(photoUpdates).length} portraits to candidates.`);
  };

  // Update Photo Framing (Zoom/Pan)
  const handleUpdatePhotoSpecs = (studentId, specs) => {
    const updated = students.map((stu) => {
      if (stu.id === studentId) {
        return {
          ...stu,
          photoSpecs: { ...stu.photoSpecs, ...specs },
        };
      }
      return stu;
    });
    setStudents(updated);
    saveStoredStudents(updated.filter((s) => (s.id || '').startsWith('manual-')));
  };

  // Selection toggle
  const handleToggleSelectStudent = (id) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  // Schools detected across all fetched records
  const schools = useMemo(() => detectSchools(students), [students]);

  // The book covers ONE school only: valid records from the selected school
  // that are also checked for inclusion.
  const bookStudents = useMemo(() => {
    return students.filter((s) => {
      if (!selectedStudentIds.has(s.id)) return false;
      if (!selectedSchool) return (s.validation || validateStudentRecord(s)).valid;
      return normalizeSchoolName(s.school) === normalizeSchoolName(selectedSchool);
    });
  }, [students, selectedStudentIds, selectedSchool]);

  const excludedInvalidCount = useMemo(
    () => students.filter((s) => !(s.validation || validateStudentRecord(s)).valid).length,
    [students]
  );

  const otherSchoolCount = useMemo(() => {
    if (!selectedSchool) return 0;
    return students.filter(
      (s) =>
        (s.validation || validateStudentRecord(s)).valid &&
        normalizeSchoolName(s.school) !== normalizeSchoolName(selectedSchool)
    ).length;
  }, [students, selectedSchool]);

  const duplicateCount = useMemo(
    () => detectDuplicateRecords(students).length,
    [students]
  );

  // Sections within the selected school, for roster filtering
  const availableSections = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (!selectedSchool || normalizeSchoolName(s.school) === normalizeSchoolName(selectedSchool)) {
        if (s.section) set.add(s.section);
      }
    });
    return Array.from(set);
  }, [students, selectedSchool]);

  // Filtered & Sorted Student Roster (scoped to the selected school)
  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      const matchSearch =
        (s.name || '').toLowerCase().includes(searchRoster.toLowerCase()) ||
        (s.studentId || '').toLowerCase().includes(searchRoster.toLowerCase()) ||
        (s.nickname || '').toLowerCase().includes(searchRoster.toLowerCase()) ||
        (s.motto || '').toLowerCase().includes(searchRoster.toLowerCase()) ||
        (s.honors || '').toLowerCase().includes(searchRoster.toLowerCase());

      const matchSection = filterSection === 'ALL' || s.section === filterSection;
      const matchSchool =
        !selectedSchool || normalizeSchoolName(s.school) === normalizeSchoolName(selectedSchool);

      return matchSearch && matchSection && matchSchool;
    });

    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'officers-first') {
      result.sort((a, b) => (b.isOfficer ? 1 : 0) - (a.isOfficer ? 1 : 0));
    } else if (sortBy === 'completeness') {
      result.sort((a, b) => (b.completeness?.score || 0) - (a.completeness?.score || 0));
    }

    return result;
  }, [students, searchRoster, filterSection, sortBy, selectedSchool]);

  // Preflight Quality Check — runs on the book scope (one school)
  const preflight = useMemo(() => {
    return runPreflightQualityCheck(config, bookStudents, {
      excludedInvalidCount,
      otherSchoolCount,
    });
  }, [config, bookStudents, excludedInvalidCount, otherSchoolCount]);

  // Print → Save as PDF on fixed A4 bond paper.
  const handlePrintExport = () => {
    setIsExportOpen(false);
    setTimeout(() => window.print(), 150);
  };

  // Cover editor save
  const handleSaveCovers = (coverConfig) => {
    const updated = { ...config, ...coverConfig };
    setConfig(updated);
    saveStoredProject(updated);
    showToast('Covers updated.');
  };

  return (
    <div className="space-y-6 animate-fade-in font-body pb-16 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-5">
      <style>{getPrintCss()}</style>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Header (full width) ───────────────────────────────────────── */}
      <YearbookAdminToolbar
        preflight={preflight}
        onOpenPreflightAudit={() => setIsAuditOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        studentCount={bookStudents.length}
        selectedSchool={selectedSchool}
      />

      {/* ── 3/4 yearbook + 1/4 tools ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <div className="xl:col-span-3 space-y-6 min-w-0">

      {/* ── Empty State when Zero Records in Database ────────────────────── */}
      {students.length === 0 && !isDetectingDB && (
        <div className="bg-white rounded-3xl border-2 border-dashed border-neutral-200 p-10 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto border border-amber-200">
            <BookOpen size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-heading text-lg font-bold text-neutral-900">
              No Student Records Found
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              The yearbook is built from booking and profile records in the database. Nothing is added automatically.
            </p>
          </div>

          <div className="p-4 bg-neutral-50 rounded-2xl max-w-lg mx-auto text-left border border-neutral-200/80 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-800">
              <Info size={14} className="text-amber-600" />
              <span>Where records come from:</span>
            </div>
            <ul className="list-disc list-inside text-neutral-600 space-y-1 text-[11px]">
              <li>Academic Graduation bookings (Senior High, College, Preschool).</li>
              <li>Booking notes with <code className="font-mono bg-neutral-200 px-1 rounded">• School:</code>, <code className="font-mono bg-neutral-200 px-1 rounded">• Degree:</code>, and <code className="font-mono bg-neutral-200 px-1 rounded">• Section:</code>.</li>
              <li>Customer profiles with photos and details.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleAutoDetectDB}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Database size={14} className="text-amber-400" />
              <span>Scan Database Bookings</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBatchUploadOpen(true)}
              className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Camera size={14} className="text-amber-600" />
              <span>Batch Upload 2×2 Photos</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddStudent}
              className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Candidate Manually</span>
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW: PDF Pages (primary — exactly what gets exported) ─────── */}
      {viewMode === 'print' && (
        <section className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                <Printer size={18} className="text-amber-600" />
                <span>PDF Pages — A4 Print Order</span>
              </h3>
              <p className="text-xs text-neutral-500">
                {selectedSchool || 'No school selected'} · Cover → message → directory → student pages → back cover. This is what the Export PDF button prints.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <Printer size={13} className="text-amber-400" />
              <span>Export A4 PDF</span>
            </button>
          </div>

          {bookStudents.length > 0 ? (
            <YearbookPrintBook students={bookStudents} config={config} theme={currentTheme} />
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl">
              No valid records for {selectedSchool || 'the selected school'} yet. Fix incomplete records in the Roster or sync again.
            </div>
          )}
        </section>
      )}

      {/* ── VIEW: 3D Flippable Preview (optional — not used for export) ─── */}
      {viewMode === 'book' && bookStudents.length > 0 && (
        <section className="bg-neutral-100/70 p-4 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-inner">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
              <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">
                3D Preview · {selectedSchool} ({bookStudents.length})
              </h2>
            </div>
            <span className="text-[11px] text-neutral-500 hidden sm:inline">
              Flip through the book — use PDF Pages for export
            </span>
          </div>

          <YearbookFlipbook
            students={bookStudents}
            config={config}
            theme={currentTheme}
            onEditStudent={handleOpenEditStudent}
          />
        </section>
      )}

      {/* ── VIEW: 2×2 Photo Check ───────────────────────────────────────── */}
      {viewMode === 'twobytwo' && students.length > 0 && (
        <section className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                <Crop size={18} className="text-amber-600" />
                <span>Photo Check</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Confirm each record has a usable portrait before exporting
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTwoByTwoStudent(bookStudents[0] || students[0] || null);
                setIsTwoByTwoOpen(true);
              }}
              className="px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <Sliders size={13} className="text-amber-400" />
              <span>Open Framing Studio</span>
            </button>
          </div>

          {/* 2×2 Grid of the selected school */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {filteredStudents.map((stu) => (
              <div
                key={stu.id}
                onClick={() => handleOpenTwoByTwoForStudent(stu)}
                className="group cursor-pointer p-2.5 rounded-2xl border border-neutral-200 hover:border-amber-500 hover:shadow-lg transition-all duration-200 bg-neutral-50/50 flex flex-col items-center text-center relative"
              >
                {/* 2×2 Square Frame */}
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
                <p className="text-xs text-neutral-400 font-mono truncate w-full">
                  {stu.studentId || 'No ID'}
                </p>

                {stu.photoUrl ? (
                  <span className="mt-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                    HAS PHOTO
                  </span>
                ) : (
                  <span className="mt-1 px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold font-mono">
                    NO PHOTO
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── VIEW: Roster ───────────────────────────────────────────────── */}
      {viewMode === 'roster' && students.length > 0 && (
        <section className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-base font-bold text-neutral-900 flex items-center gap-2">
                <Users size={18} className="text-amber-600" />
                <span>Roster — {selectedSchool || 'All schools'}</span>
              </h3>
              <p className="text-xs text-neutral-500">
                {bookStudents.length} in book · {excludedInvalidCount} incomplete · {otherSchoolCount} other schools · {duplicateCount} duplicates
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Section Filter */}
              {availableSections.length > 0 && (
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="py-1.5 px-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none"
                >
                  <option value="ALL">All Sections</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              )}

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-1.5 px-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none"
              >
                <option value="name-asc">Alphabetical (Surname A-Z)</option>
                <option value="officers-first">Class Officers First</option>
                <option value="completeness">Readiness Score</option>
              </select>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchRoster}
                  onChange={(e) => setSearchRoster(e.target.value)}
                  placeholder="Search candidates..."
                  className="pl-8 pr-3 py-1.5 bg-neutral-100/80 border border-neutral-200/80 rounded-full text-xs font-medium focus:bg-white focus:border-amber-500 outline-none w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-neutral-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-100 text-xs">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size === students.length && students.length > 0}
                      onChange={handleSelectAll}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Student &amp; ID</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Section &amp; Program</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Motto</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                {filteredStudents.map((stu) => {
                  const isChecked = selectedStudentIds.has(stu.id);
                  const validation = stu.validation || validateStudentRecord(stu);

                  return (
                    <tr key={stu.id} className={`hover:bg-neutral-50/60 transition-colors ${validation.valid ? '' : 'bg-rose-50/40'}`}>
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectStudent(stu.id)}
                          className="rounded accent-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* 2×2 Photo */}
                      <td className="py-2.5 px-4">
                        <div
                          onClick={() => handleOpenTwoByTwoForStudent(stu)}
                          className="w-10 h-10 rounded-lg bg-neutral-900 overflow-hidden ring-1 ring-amber-400/50 relative shadow-2xs cursor-pointer group"
                        >
                          {stu.photoUrl ? (
                            <img
                              src={stu.photoUrl}
                              alt={stu.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-amber-300 font-mono">
                              N/A
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-neutral-900/90 text-amber-300 text-[8px] font-black uppercase text-center py-0.2">
                            2×2
                          </span>
                        </div>
                      </td>

                      {/* Name & ID — no invented fallbacks */}
                      <td className="py-2.5 px-4">
                        <p className="font-bold text-neutral-900">{stu.name || <span className="text-rose-600">Missing name</span>}</p>
                        <p className="text-xs text-neutral-400 font-mono">
                          {stu.studentId ? `ID: ${stu.studentId}` : <span className="text-rose-600">Missing ID</span>}
                        </p>
                      </td>

                      {/* School */}
                      <td className="py-2.5 px-4">
                        {stu.school ? (
                          <p className="font-semibold text-neutral-800 truncate max-w-[140px]">{stu.school}</p>
                        ) : (
                          <span className="text-rose-600 text-[11px] font-bold">Missing school</span>
                        )}
                      </td>

                      {/* Section & Program — no invented fallbacks */}
                      <td className="py-2.5 px-4">
                        {stu.section ? (
                          <p className="font-semibold text-neutral-800">{stu.section}</p>
                        ) : (
                          <span className="text-rose-600 text-[11px] font-bold">Missing section</span>
                        )}
                        {(stu.degree || stu.credentials) && (
                          <p className="text-xs text-neutral-400 truncate max-w-[140px]">
                            {stu.degree || stu.credentials}
                          </p>
                        )}
                      </td>

                      {/* Role — officers only when explicitly assigned */}
                      <td className="py-2.5 px-4">
                        {stu.isOfficer ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 uppercase">
                            {stu.role}
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">Student</span>
                        )}
                        {stu.honors && (
                          <p className="text-xs text-amber-700 font-semibold mt-0.5 truncate max-w-[120px]">
                            {stu.honors}
                          </p>
                        )}
                      </td>

                      {/* Motto */}
                      <td className="py-2.5 px-4 max-w-xs truncate italic text-neutral-600 font-serif">
                        {stu.motto ? `"${stu.motto}"` : <span className="text-neutral-400 font-sans not-italic text-[11px]">—</span>}
                      </td>

                      {/* Validation status */}
                      <td className="py-2.5 px-4">
                        {validation.valid ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            In book
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold cursor-help"
                            title={validation.errors.join(', ')}
                          >
                            Fix needed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenTwoByTwoForStudent(stu)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-amber-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="2×2 Crop Inspector"
                          >
                            <Crop size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(stu)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-amber-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(stu.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove from Yearbook"
                          >
                            <Trash2 size={14} />
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

        </div>{/* end 3/4 yearbook column */}

        {/* ── 1/4 tools column ─────────────────────────────────────────────── */}
        <aside className="xl:col-span-1 min-w-0 xl:sticky xl:top-4">
          <YearbookToolsSidebar
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onAutoDetectDB={handleAutoDetectDB}
            onAddStudent={handleOpenAddStudent}
            onBatchUploadPhotos={() => setIsBatchUploadOpen(true)}
            onOpenTwoByTwoRoll={() => {
              setTwoByTwoStudent(bookStudents[0] || students[0] || null);
              setIsTwoByTwoOpen(true);
            }}
            onOpenExportModal={() => setIsExportOpen(true)}
            onEditCovers={() => setIsCoverEditorOpen(true)}
            isDetectingDB={isDetectingDB}
            viewMode={viewMode}
            onSelectViewMode={setViewMode}
            schools={schools}
            selectedSchool={selectedSchool}
            onSelectSchool={handleSelectSchool}
            duplicateCount={duplicateCount}
            onRemoveDuplicates={handleRemoveDuplicates}
          />
        </aside>
      </div>

      {/* ── Modals & Drawers ─────────────────────────────────────────────── */}

      {/* 1. Individual Student Editor Modal (validated, same-school enforced) */}
      <IndividualStudentEditorModal
        isOpen={isEditorOpen}
        student={editingStudent}
        defaultSchool={selectedSchool}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
      />

      {/* 2. Cover Editor Modal */}
      <YearbookCoverEditorModal
        isOpen={isCoverEditorOpen}
        onClose={() => setIsCoverEditorOpen(false)}
        config={config}
        students={bookStudents}
        studentCount={bookStudents.length}
        pageCount={getStudentPageCount(bookStudents.length, config.layoutDensity || 6)}
        onSave={handleSaveCovers}
      />

      {/* 3. A4 PDF Export Modal with Preflight */}
      <YearbookExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
        students={bookStudents}
        preflight={preflight}
        onTriggerPrint={handlePrintExport}
      />

      {/* 4. Batch Photo Upload Modal */}
      <BatchPhotoUploadModal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        students={filteredStudents}
        onApplyPhotos={handleApplyBatchPhotos}
      />

      {/* 5. 2×2 Roll Inspector Modal */}
      <TwoByTwoRollModal
        isOpen={isTwoByTwoOpen}
        onClose={() => setIsTwoByTwoOpen(false)}
        student={twoByTwoStudent}
        students={filteredStudents}
        onUpdateStudentPhotoSpecs={handleUpdatePhotoSpecs}
        onOpenFullEditor={(stu) => {
          setIsTwoByTwoOpen(false);
          handleOpenEditStudent(stu);
        }}
      />

      {/* 6. Preflight Audit Drawer */}
      <CompletenessAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        preflight={preflight}
        students={bookStudents}
        config={config}
        onSelectStudent={handleOpenEditStudent}
        onRemoveDuplicates={handleRemoveDuplicates}
      />

    </div>
  );
}

// ── Print stylesheet: fixed A4 bond paper (210 × 297 mm portrait) ──────────
function getPrintCss() {
  return `
    /* Screen: stacked A4-ratio sheets with labels */
    .yb-print-book .yb-screen-label {
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .yb-print-book .yb-sheet {
      aspect-ratio: 210 / 297;
      max-height: 1000px;
      width: 100%;
      max-width: 640px;
      margin-inline: auto;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e5e5;
    }
    .yb-print-book .yb-sheet > div { height: 100%; }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body * { visibility: hidden !important; }
      #yearbook-print-book, #yearbook-print-book * { visibility: visible !important; }
      #yearbook-print-book {
        position: absolute !important;
        inset: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }
      #yearbook-print-book .yb-screen-label { display: none !important; }
      #yearbook-print-book .yb-print-page {
        margin: 0 !important;
        padding: 0 !important;
        break-after: page;
        page-break-after: always;
      }
      #yearbook-print-book .yb-print-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      #yearbook-print-book .yb-sheet {
        border: none !important;
        border-radius: 0 !important;
        aspect-ratio: auto !important;
        max-height: none !important;
        max-width: none !important;
        width: 210mm !important;
        height: 297mm !important;
      }
      #yearbook-print-book .yb-sheet > div {
        height: 297mm !important;
        box-shadow: none !important;
      }
      #yearbook-print-book img {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
}
