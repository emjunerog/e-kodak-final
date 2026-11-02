import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  School,
  Users,
  Check,
  ChevronDown
} from "lucide-react";
import {
  scanSchoolMasterlistPDF,
  generateMockMasterlist
} from "../../services/pdfMasterlistScannerService";

/**
 * SchoolMasterlistUploader
 * ============================================================================
 * Dedicated UI component for School Section Masterlist PDF uploading,
 * automated student roster scanning, and interactive order inspection.
 * ============================================================================
 */
export default function SchoolMasterlistUploader({
  masterlistData,
  onMasterlistChange,
  availableTiers = ["Set A", "Set B", "Set C", "Set D"],
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

  const fileInputRef = useRef(null);

  const students = masterlistData?.students || [];

  // Recalculate summary counts whenever students change
  const recalculateSummary = (newStudents, baseData = masterlistData) => {
    const setCounts = {};
    availableTiers.forEach((t) => {
      setCounts[t] = 0;
    });
    newStudents.forEach((s) => {
      setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
    });
    return {
      ...(baseData || {}),
      students: newStudents,
      summary: {
        total: newStudents.length,
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
        setScanProgress("Scanning student roster and matching package tiers (Set A, B, C, D)...");
      }, 600);

      const result = await scanSchoolMasterlistPDF(file, availableTiers);

      if (!result.students || result.students.length === 0) {
        setScanError(
          "We could not automatically detect student rows from this PDF. You can upload another PDF or use the demo sample roster."
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
    setScanProgress("Loading sample graduation section masterlist...");

    setTimeout(() => {
      const mock = generateMockMasterlist(availableTiers);
      onMasterlistChange(mock);
      if (onSchoolNameChange) onSchoolNameChange(mock.school);
      if (onSectionNameChange) onSectionNameChange(mock.section);
      setIsScanning(false);
      setScanProgress("");
    }, 450);
  };

  const handleUpdateStudentTier = (studentId, newTier) => {
    const updated = students.map((s) => (s.id === studentId ? { ...s, packageSet: newTier } : s));
    onMasterlistChange(recalculateSummary(updated));
  };

  const handleDeleteStudent = (studentId) => {
    const updated = students.filter((s) => s.id !== studentId);
    onMasterlistChange(recalculateSummary(updated));
  };

  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const nextId = students.length > 0 ? Math.max(...students.map((s) => s.id || 0)) + 1 : 1;
    const newEntry = {
      id: nextId,
      studentNo: newStudentId.trim() || `STU-${String(nextId).padStart(3, "0")}`,
      name: newStudentName.trim(),
      packageSet: newStudentTier,
      section: sectionName || "School Section",
      status: "verified"
    };

    const updated = [...students, newEntry];
    onMasterlistChange(recalculateSummary(updated));
    setNewStudentName("");
    setNewStudentId("");
    setShowAddModal(false);
  };

  // Filtered student list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentNo && s.studentNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = selectedFilterTier === "all" || s.packageSet === selectedFilterTier;
    return matchesSearch && matchesTier;
  });

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
            className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer overflow-hidden ${
              isDragging
                ? "border-gold bg-amber-500/15 ring-4 ring-gold/20 scale-[1.01]"
                : "border-neutral-300 hover:border-gold/80 bg-gradient-to-b from-white via-amber-50/20 to-neutral-50/50 hover:bg-amber-50/30 shadow-sm"
            }`}
          >
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

            {/* Glowing amber accent */}
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 flex items-center justify-center mx-auto shadow-lg shadow-gold/25 ring-4 ring-gold/20">
                {isScanning ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <Upload size={30} className="stroke-[2.3]" />
                )}
              </div>

              <div>
                <h3 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-950">
                  {isScanning ? "Scanning PDF Masterlist..." : "Upload School Section Masterlist PDF"}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 font-body mt-1.5 leading-relaxed">
                  {isScanning
                    ? scanProgress
                    : "Drag and drop your class masterlist PDF file here, or click to browse from your device."}
                </p>
              </div>

              {!isScanning && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 px-6 py-2.5 text-xs font-bold tracking-wider shadow-md shadow-gold/20 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <FileText size={15} />
                    <span>Browse PDF File</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDemo();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gold/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={13} className="text-gold" />
                    <span>Load Sample Roster (Demo)</span>
                  </button>
                </div>
              )}

              {/* Supported format badges */}
              <div className="pt-3 border-t border-neutral-200/60 flex items-center justify-center gap-2 flex-wrap text-[11px] text-neutral-500 font-mono">
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-neutral-200">
                  .PDF Format
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-neutral-200">
                  Auto Name &amp; Order Detection
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-neutral-200">
                  Set A, B, C, D Support
                </span>
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
                  <h3 className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 truncate mt-1">
                    {schoolName || masterlistData.school || "School Section Partner"}
                  </h3>
                  <p className="text-xs text-neutral-600 font-body">
                    {sectionName || masterlistData.section || "Grade 12 Section"} · {masterlistData.batch || "Batch 2026"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
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
                  placeholder="Search student name or ID..."
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
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Student ID / No.</th>
                    <th className="py-3 px-4">Package Ordered</th>
                    <th className="py-3 px-4 text-center">Verification</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-body">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
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
                        <td className="py-3.5 px-4 font-semibold text-neutral-950">
                          {student.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-600">
                          {student.studentNo || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5">
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
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                            <CheckCircle size={11} className="text-emerald-600" />
                            Detected
                          </span>
                        </td>
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
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4">
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
                  Full Name (Last, First M.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Santos, Maria Clara"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 font-semibold text-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Student ID Number
                </label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g. 2026-0142"
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
        </div>
      )}
    </div>
  );
}

