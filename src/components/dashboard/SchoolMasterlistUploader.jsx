import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  School,
  Users,
  Check,
  ChevronDown,
  Download,
  Mail,
  Phone,
  BookOpen,
  Quote,
  ShieldCheck,
  FileCheck,
  HelpCircle,
  Package
} from "lucide-react";
import {
  scanSchoolMasterlistPDF,
  generateMockMasterlist
} from "../../services/pdfMasterlistScannerService";
import {
  generateMasterlistPDFTemplate,
  validateStudentCompleteName
} from "../../services/masterlistTemplateService";

/**
 * SchoolMasterlistUploader
 * ============================================================================
 * Dedicated UI component for School Section Masterlist PDF uploading,
 * automated student roster scanning, template generation, and interactive inspection.
 *
 * Implements strict studio intake criteria:
 *   1. Name of School
 *   2. Strand
 *   3. Section
 *   4. Class Adviser's Name & Email
 *   5. Phone Number of the Class Adviser
 *   6. Batch #
 *   7. Student ID Number
 *   8. Complete Name (Strict: Invalid if missing middle or last name)
 *   9. Package & Set (Set A, Set B, Set C, Set D)
 *  10. Each Student's Yearbook Motto
 * ============================================================================
 */
export default function SchoolMasterlistUploader({
  masterlistData,
  onMasterlistChange,
  availableTiers = ["Set A", "Set B", "Set C", "Set D"],
  packageName = "Senior High Packages",
  schoolName,
  onSchoolNameChange,
  sectionName,
  onSectionNameChange
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanError, setScanError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterTier, setSelectedFilterTier] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentTier, setNewStudentTier] = useState(availableTiers[0] || "Set A");
  const [newStudentMotto, setNewStudentMotto] = useState("");
  const [editingMottoId, setEditingMottoId] = useState(null);
  const [tempMotto, setTempMotto] = useState("");
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const fileInputRef = useRef(null);

  const students = masterlistData?.students || [];

  // Recalculate summary counts whenever students change
  const recalculateSummary = (newStudents, baseData = masterlistData) => {
    const setCounts = {};
    availableTiers.forEach((t) => {
      setCounts[t] = 0;
    });

    let validCount = 0;
    let invalidCount = 0;

    newStudents.forEach((s) => {
      setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
      if (s.isValidName) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    return {
      ...(baseData || {}),
      students: newStudents,
      summary: {
        total: newStudents.length,
        validStudents: validCount,
        invalidStudents: invalidCount,
        setCounts
      }
    };
  };

  const handleProcessFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setScanError("Please select a valid PDF masterlist file (.pdf).");
      return;
    }

    setIsScanning(true);
    setScanError("");
    setScanProgress("Extracting text and coordinate layers from PDF...");

    try {
      setTimeout(() => {
        setScanProgress("Scanning school metadata, adviser credentials, and student package orders...");
      }, 500);

      const result = await scanSchoolMasterlistPDF(file, availableTiers);

      if (!result.students || result.students.length === 0) {
        setScanError(
          "We could not automatically detect student rows from this PDF. Please download our Official Template or test with the sample roster."
        );
        setIsScanning(false);
        return;
      }

      onMasterlistChange({
        ...result,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + " KB"
      });

      if (result.school && onSchoolNameChange) {
        onSchoolNameChange(result.school);
      }
      if (result.section && onSectionNameChange) {
        onSectionNameChange(result.section);
      }
    } catch (err) {
      console.error("Masterlist scanning failed:", err);
      setScanError(err.message || "Failed to parse PDF masterlist. Please try again or test with the sample roster.");
    } finally {
      setIsScanning(false);
      setScanProgress("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadDemo = () => {
    setIsScanning(true);
    setScanError("");
    setScanProgress("Loading sample graduation section masterlist with adviser & student mottos...");

    setTimeout(() => {
      const mock = generateMockMasterlist(availableTiers);
      onMasterlistChange(mock);
      if (onSchoolNameChange) onSchoolNameChange(mock.school);
      if (onSectionNameChange) onSectionNameChange(mock.section);
      setIsScanning(false);
      setScanProgress("");
    }, 400);
  };

  const handleDownloadBlankTemplate = (e) => {
    e?.stopPropagation();
    generateMasterlistPDFTemplate({
      school: schoolName || "Name of School",
      strand: masterlistData?.strand || "Academic Strand",
      section: sectionName || "Class Section",
      batch: masterlistData?.batch || "Batch 2026",
      adviserName: masterlistData?.adviserName || "",
      adviserEmail: masterlistData?.adviserEmail || "",
      adviserPhone: masterlistData?.adviserPhone || "",
      packageName: packageName || masterlistData?.selectedPackage || masterlistData?.packageName || "Senior High Packages",
      isSample: false
    });
    setShowTemplateDropdown(false);
  };

  const handleDownloadSampleTemplate = (e) => {
    e?.stopPropagation();
    generateMasterlistPDFTemplate({
      school: schoolName || "Lipata Senior High School",
      strand: "ABM (Accountancy, Business & Management)",
      section: sectionName || "Alcala",
      batch: "Batch 2026",
      adviserName: "Prof. Juanita Dela Cruz",
      adviserEmail: "adviser.delacruz@school.edu.ph",
      adviserPhone: "0917-890-1234",
      packageName: packageName || masterlistData?.selectedPackage || masterlistData?.packageName || "Senior High Packages",
      isSample: true
    });
    setShowTemplateDropdown(false);
  };

  const handleExportCurrentRoster = (e) => {
    e?.stopPropagation();
    generateMasterlistPDFTemplate({
      school: schoolName || masterlistData?.school || "Lipata Senior High School",
      strand: masterlistData?.strand || "ABM",
      section: sectionName || masterlistData?.section || "Alcala",
      batch: masterlistData?.batch || "Batch 2026",
      adviserName: masterlistData?.adviserName || "Prof. Juanita Dela Cruz",
      adviserEmail: masterlistData?.adviserEmail || "adviser@school.edu.ph",
      adviserPhone: masterlistData?.adviserPhone || "0917-890-1234",
      packageName: packageName || masterlistData?.selectedPackage || masterlistData?.packageName || "Senior High Packages",
      students: students,
      isSample: false,
      fileName: `Verified_Masterlist_${(schoolName || "School").replace(/\s+/g, "_")}_${(sectionName || "Section").replace(/\s+/g, "_")}.pdf`
    });
  };

  const handleUpdateStudentTier = (studentId, newTier) => {
    const updated = students.map((s) => (s.id === studentId ? { ...s, packageSet: newTier } : s));
    onMasterlistChange(recalculateSummary(updated));
  };

  const handleSaveMotto = (studentId) => {
    const updated = students.map((s) => (s.id === studentId ? { ...s, motto: tempMotto.trim() } : s));
    onMasterlistChange(recalculateSummary(updated));
    setEditingMottoId(null);
    setTempMotto("");
  };

  const handleDeleteStudent = (studentId) => {
    const updated = students.filter((s) => s.id !== studentId);
    onMasterlistChange(recalculateSummary(updated));
  };

  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const nameValidation = validateStudentCompleteName(newStudentName.trim());
    const nextId = students.length > 0 ? Math.max(...students.map((s) => s.id || 0)) + 1 : 1;
    const newEntry = {
      id: nextId,
      studentNo: newStudentId.trim() || `2026-${String(nextId + 100).padStart(4, "0")}`,
      name: newStudentName.trim(),
      packageSet: newStudentTier,
      motto: newStudentMotto.trim(),
      section: sectionName || "School Section",
      strand: masterlistData?.strand || "Academic Strand",
      isValidName: nameValidation.isValid,
      validationError: nameValidation.isValid ? null : nameValidation.reason,
      status: nameValidation.isValid ? "verified" : "invalid_name"
    };

    const updated = [...students, newEntry];
    onMasterlistChange(recalculateSummary(updated));
    setNewStudentName("");
    setNewStudentId("");
    setNewStudentMotto("");
    setShowAddModal(false);
  };

  // Filtered student list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentNo && s.studentNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.motto && s.motto.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = selectedFilterTier === "all" || s.packageSet === selectedFilterTier;
    return matchesSearch && matchesTier;
  });

  const invalidStudentsCount = students.filter((s) => !s.isValidName).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── CASE 1: NO FILE SCANNED YET ── */}
      {(!masterlistData || students.length === 0) && (
        <div className="space-y-5">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed py-12 sm:py-16 px-6 sm:px-12 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-gold bg-amber-500/15 ring-4 ring-gold/20 scale-[1.01]"
                : "border-amber-300/80 hover:border-gold bg-gradient-to-b from-white via-amber-50/25 to-neutral-50/60 hover:bg-amber-50/35 shadow-xs"
            }`}
          >
            {/* Background glowing blur constrained to rounded corners */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gold/15 rounded-full blur-3xl" />
            </div>

            {/* Help / Instructions Guide Button (Top-Right of Box) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInstructionsModal(true);
              }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 px-3 py-1.5 rounded-full border border-neutral-300 hover:border-gold bg-white hover:bg-amber-50/80 text-neutral-700 hover:text-amber-950 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer z-20 group"
              title="How to prepare your School Masterlist PDF (Instructions & Requirements)"
            >
              <HelpCircle size={15} className="text-amber-700 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-neutral-700 group-hover:text-amber-950">Guide</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />

            <div className="relative z-10 max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 flex items-center justify-center mx-auto shadow-lg shadow-gold/25 ring-4 ring-gold/20">
                {isScanning ? (
                  <Loader2 size={30} className="animate-spin" />
                ) : (
                  <Upload size={28} className="stroke-[2.3]" />
                )}
              </div>

              <div className="space-y-1.5 pt-0.5">
                <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-950 tracking-tight">
                  {isScanning ? "Scanning PDF Masterlist..." : "Upload School Section Masterlist PDF"}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 font-body leading-relaxed max-w-md mx-auto">
                  {isScanning
                    ? scanProgress
                    : "Drag and drop your class masterlist PDF file here, or click to browse from your device."}
                </p>
              </div>

              {!isScanning && (
                <div className="pt-2">
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {/* Browse File Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 px-5 py-2.5 text-xs font-bold tracking-wider shadow-md shadow-gold/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap min-w-[155px]"
                    >
                      <Upload size={14} className="stroke-[2.5]" />
                      <span>Browse PDF File</span>
                    </button>

                    {/* Download Blank Sheet */}
                    <button
                      type="button"
                      onClick={handleDownloadBlankTemplate}
                      className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:border-gold bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                      title="Download clean official PDF template ready for entry"
                    >
                      <FileText size={14} className="text-amber-700" />
                      <span>Download Blank Sheet (.PDF)</span>
                    </button>

                    {/* Download Sample Sheet */}
                    <button
                      type="button"
                      onClick={handleDownloadSampleTemplate}
                      className="px-4 py-2.5 rounded-xl border border-gold/40 hover:border-gold bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                      title="Download sample PDF pre-filled with sample student data"
                    >
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Download Sample Roster</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Masterlist Data Requirements Blueprint Strip (Things Needed for Upload) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white space-y-5 shadow-sm font-body">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/20 text-gold flex items-center justify-center shrink-0">
                  <ShieldCheck size={17} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gold">
                    Things Needed for School Masterlist Upload
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    The 10 mandated data fields required in your PDF for automated student &amp; order detection
                  </p>
                </div>
              </div>
            </div>

            {/* Group 1: Section & Institution Metadata (Header Information) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300/80 uppercase tracking-wider font-mono">
                <School size={13} className="text-gold" />
                <span>Class &amp; Institution Details (Header Information)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Name of School</strong>
                    <span className="text-[11px] text-neutral-400">Partner school or campus name</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Academic Strand / Track</strong>
                    <span className="text-[11px] text-neutral-400">e.g. STEM, ABM, HUMSS, TVL</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Class Section</strong>
                    <span className="text-[11px] text-neutral-400">Official section designation</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Class Adviser Name &amp; Email</strong>
                    <span className="text-[11px] text-neutral-400">Official faculty adviser contact</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Class Adviser Phone Number</strong>
                    <span className="text-[11px] text-neutral-400">Mobile number for photoshoot coordination</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    6
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Graduation Batch</strong>
                    <span className="text-[11px] text-neutral-400">e.g. Batch 2026, Class of 2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: Individual Student Roster Requirements (Table Data) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300/80 uppercase tracking-wider font-mono">
                <Users size={13} className="text-gold" />
                <span>Student Roster Entry Requirements (Per Row)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {/* 7 - Student ID Number */}
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    7
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Student ID Number</strong>
                    <span className="text-[11px] text-neutral-400">Official school-issued student identifier</span>
                  </div>
                </div>

                {/* 8 - Complete Student Name */}
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors sm:col-span-1 lg:col-span-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    8
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">
                      Complete Student Name
                    </strong>
                    <span className="text-[11px] text-neutral-400 block mt-0.5 leading-relaxed">
                      Must include First Name, Middle Name (or Initial), and Last Name (e.g. <em>Santos, Maria Clara P.</em>). Any student entry missing a middle name or last name will be flagged as INVALID.
                    </span>
                  </div>
                </div>

                {/* 9 - Student Set Category */}
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    9
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Student Set Category</strong>
                    <span className="text-[11px] text-neutral-400">Assigned package set: Set A, Set B, Set C, or Set D</span>
                  </div>
                </div>

                {/* 10 - Student Yearbook Motto */}
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors sm:col-span-1 lg:col-span-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    10
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Student Yearbook Motto</strong>
                    <span className="text-[11px] text-neutral-400">Graduation quote printed under portrait in the official yearbook</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {scanError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed">
                <strong>Upload Notice:</strong> {scanError}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CASE 2: MASTERLIST SCANNED & ROSTER READY ── */}
      {masterlistData && students.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Summary Card */}
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-white via-neutral-50/80 to-amber-50/30 border border-gold/40 shadow-sm relative overflow-hidden">
            {/* Golden top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center shrink-0 shadow-md border border-gold/40 mt-0.5">
                  <School size={22} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                      <Check size={11} className="inline mr-1" />
                      Masterlist Scanned
                    </span>
                    {masterlistData.fileName && (
                      <span className="text-[11px] font-mono text-neutral-500 truncate">
                        📄 {masterlistData.fileName}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-extrabold text-base sm:text-xl text-neutral-950 truncate mt-1">
                    {schoolName || masterlistData.school || "School Section Partner"}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-600 font-body mt-0.5">
                    <span className="font-bold text-neutral-800">
                      {masterlistData.strand || "Strand"}
                    </span>
                    <span>·</span>
                    <span>
                      {sectionName || masterlistData.section || "Grade 12 Section"}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-amber-800">
                      {masterlistData.batch || "Batch 2026"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleExportCurrentRoster}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 hover:border-gold bg-white text-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Export verified masterlist to PDF"
                >
                  <Download size={13} className="text-amber-700" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gold border border-gold/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 hover:border-gold bg-white text-neutral-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Upload a different PDF file"
                >
                  <RefreshCw size={13} />
                  <span>Re-upload PDF</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            {/* Class Adviser & Package Metadata Details Strip */}
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-amber-700 shrink-0" />
                  <span className="text-neutral-500 font-semibold">Class Adviser:</span>
                  <strong className="text-neutral-950 font-heading">
                    {masterlistData.adviserName || "Prof. Juanita Dela Cruz"}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200/70 text-amber-950 font-bold text-[11px] font-mono border border-amber-300">
                  <Package size={12} className="text-amber-800" />
                  <span>Package: {masterlistData.selectedPackage || masterlistData.packageName || packageName || "Senior High Packages"}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap text-neutral-600">
                {masterlistData.adviserEmail && (
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Mail size={12} className="text-amber-600" />
                    <span>{masterlistData.adviserEmail}</span>
                  </div>
                )}
                {masterlistData.adviserPhone && (
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Phone size={12} className="text-amber-600" />
                    <span>{masterlistData.adviserPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name Validation Alert Banner (if any names missing middle/last name) */}
            {invalidStudentsCount > 0 && (
              <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-pulse">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Validation Warning:</strong> {invalidStudentsCount} student(s) in this masterlist do not have a complete name (missing middle name or last name). Please update their names before finalizing.
                </div>
              </div>
            )}

            {/* Quick KPI Stat Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-neutral-200/70">
              <div className="p-3 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                    Total Students
                  </span>
                  <span className="font-heading font-black text-neutral-950 text-base leading-none">
                    {students.length}
                  </span>
                </div>
              </div>

              {availableTiers.map((tier) => {
                const count = masterlistData.summary?.setCounts?.[tier] || 0;
                return (
                  <div
                    key={tier}
                    onClick={() => setSelectedFilterTier(selectedFilterTier === tier ? "all" : tier)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedFilterTier === tier
                        ? "border-gold bg-amber-500/15 ring-2 ring-gold/40 shadow-xs"
                        : "border-neutral-200 bg-white hover:border-neutral-300 shadow-2xs"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block">
                        {tier}
                      </span>
                      <span className="font-heading font-black text-neutral-950 text-base leading-none mt-0.5 block">
                        {count}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {students.length > 0 ? Math.round((count / students.length) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Roster Table Container */}
          <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
            {/* Table Filters Bar */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50/50">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name, ID, or motto..."
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-semibold text-neutral-900 outline-none transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500 font-semibold mr-1">Filter Set:</span>
                <button
                  type="button"
                  onClick={() => setSelectedFilterTier("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFilterTier === "all"
                      ? "bg-neutral-900 text-gold shadow-2xs"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  All ({students.length})
                </button>
                {availableTiers.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedFilterTier(tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedFilterTier === tier
                        ? "bg-gradient-to-r from-amber-400 to-gold text-neutral-950 shadow-2xs"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {tier} ({masterlistData.summary?.setCounts?.[tier] || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Student Complete Name</th>
                    <th className="py-3 px-4">Student ID Number</th>
                    <th className="py-3 px-4">Set Category</th>
                    <th className="py-3 px-4">Yearbook Motto</th>
                    <th className="py-3 px-4 text-center">Name Validation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-body">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        <Users size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">No students match your search filter</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Try clearing the search query or set filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => (
                      <tr
                        key={student.id || idx}
                        className="hover:bg-amber-50/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4 text-center font-mono text-neutral-400 font-bold">
                          {idx + 1}
                        </td>

                        {/* Student Complete Name with formatting */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-neutral-950">
                            {student.name}
                          </div>
                          {!student.isValidName && (
                            <div className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span>{student.validationError || "Invalid complete name"}</span>
                            </div>
                          )}
                        </td>

                        {/* Student ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-700">
                          {student.studentNo || "—"}
                        </td>

                        {/* Package Set */}
                        <td className="py-3.5 px-4">
                          <select
                            value={student.packageSet}
                            onChange={(e) => handleUpdateStudentTier(student.id, e.target.value)}
                            className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50/60 font-heading font-bold text-xs text-neutral-950 outline-none focus:ring-2 focus:ring-gold/30 cursor-pointer shadow-2xs"
                          >
                            {availableTiers.map((tier) => (
                              <option key={tier} value={tier}>
                                {tier}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Yearbook Motto */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {editingMottoId === student.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={tempMotto}
                                onChange={(e) => setTempMotto(e.target.value)}
                                placeholder="Enter yearbook motto..."
                                className="h-8 px-2 rounded-lg border border-gold focus:ring-2 focus:ring-gold/25 text-xs text-neutral-900 w-full"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveMotto(student.id)}
                                className="p-1 rounded-md bg-neutral-900 text-gold hover:bg-neutral-800"
                                title="Save motto"
                              >
                                <Check size={13} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingMottoId(student.id);
                                setTempMotto(student.motto || "");
                              }}
                              className="cursor-pointer group/motto flex items-start gap-1 text-neutral-700 hover:text-amber-900"
                              title="Click to edit motto"
                            >
                              <Quote size={12} className="text-amber-500 shrink-0 mt-0.5 opacity-60" />
                              <span className="italic line-clamp-2">
                                {student.motto ? `“${student.motto}”` : <span className="text-neutral-400 not-italic">+ Add Motto</span>}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Name Validation Status */}
                        <td className="py-3.5 px-4 text-center">
                          {student.isValidName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                              <CheckCircle size={11} className="text-emerald-600" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-red-800 bg-red-50 border border-red-300 px-2 py-0.5 rounded-full">
                              <AlertCircle size={11} className="text-red-600" />
                              Incomplete Name
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove student from list"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
              <span className="font-semibold">
                Showing {filteredStudents.length} of {students.length} students detected from PDF
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 font-bold text-amber-900 hover:text-amber-950 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Missing Student</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MANUALLY ADD STUDENT ── */}
      {showAddModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gold/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h4 className="font-heading font-bold text-base text-neutral-950">
                Add Student to Masterlist
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-950 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Complete Name (Last Name, First Name Middle Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Santos, Maria Clara P."
                  required
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 font-semibold text-neutral-900 outline-none"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  * Must include First, Middle (or Initial), and Last name. Single/2-word names without middle name will be flagged invalid.
                </p>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Student ID Number
                </label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g. 2026-00142"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 font-semibold text-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Package Set Order
                </label>
                <select
                  value={newStudentTier}
                  onChange={(e) => setNewStudentTier(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 font-semibold text-neutral-900 outline-none cursor-pointer"
                >
                  {availableTiers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Yearbook Motto / Quotation
                </label>
                <input
                  type="text"
                  value={newStudentMotto}
                  onChange={(e) => setNewStudentMotto(e.target.value)}
                  placeholder="e.g. Perseverance and dedication will illuminate every path forward."
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 font-semibold text-neutral-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-neutral-950 font-bold shadow-md shadow-gold/20"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: MASTERLIST INSTRUCTIONS & REQUIREMENTS ── */}
      {showInstructionsModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 font-body"
          onClick={() => setShowInstructionsModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-gold/40 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                  <HelpCircle size={22} className="stroke-[2.3]" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-neutral-950">
                    School Masterlist Instructions
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Step-by-step instructions for uploading your section masterlist PDF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="w-8 h-8 rounded-full border border-neutral-200 hover:border-neutral-300 text-neutral-400 hover:text-neutral-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Steps Container */}
            <div className="space-y-3.5 text-xs">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-amber-900 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <strong className="text-sm font-heading text-neutral-950">
                    Download Masterlist Template
                  </strong>
                </div>
                <p className="text-neutral-600 leading-relaxed pl-8">
                  Get the official standardized PDF template. Use a clean blank sheet for entry, or download the sample to see a pre-filled reference.
                </p>
                <div className="flex items-center gap-2.5 pl-8 pt-0.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadBlankTemplate}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:border-gold bg-white text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileText size={13} className="text-neutral-500" />
                    <span>Download Blank Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="px-3.5 py-1.5 rounded-lg border border-gold/40 hover:border-gold bg-amber-500/10 text-amber-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles size={13} className="text-amber-600" />
                    <span>Download Sample (.PDF)</span>
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-amber-900 flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <strong className="text-sm font-heading text-neutral-950">
                    Fill Out Roster &amp; Details
                  </strong>
                </div>
                <div className="space-y-2 pl-8 text-neutral-700">
                  <p className="leading-relaxed">
                    Enter the school name, strand, section, adviser contact, batch, student IDs, package sets (Set A–D), and yearbook mottos.
                  </p>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11.5px] leading-relaxed">
                    <strong>Rule on Student Names:</strong> Every student must have a complete name (<strong>First Name</strong>, <strong>Middle Name / Initial</strong>, and <strong>Last Name</strong>). Entries missing a middle or last name will be flagged as invalid.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-amber-900 flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <strong className="text-sm font-heading text-neutral-950">
                    Save as PDF &amp; Upload
                  </strong>
                </div>
                <p className="text-neutral-600 leading-relaxed pl-8">
                  Save your file as <strong>.PDF</strong> and drop it into the upload box. The automated scanner will instantly extract every student, assign their selected package sets, and calculate order totals.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gold font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Got It, Close Instructions
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
