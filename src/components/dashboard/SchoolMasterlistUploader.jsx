import React, { useState, useRef, useEffect, useMemo } from "react";
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
  School,
  Users,
  Check,
  Download,
  Mail,
  Phone,
  BookOpen,
  Quote,
  HelpCircle,
  Package,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  Wifi,
  Activity,
  Cpu,
  Database,
  UserCheck
} from "lucide-react";
import {
  scanSchoolMasterlistPDF,
  generateMockMasterlist
} from "../../services/pdfMasterlistScannerService";
import {
  generateMasterlistPDFTemplate,
  validateStudentCompleteName
} from "../../services/masterlistTemplateService";
import {
  downloadTemplateAsConvertedDocx,
  calculateMasterlistPaymentSummary
} from "../../services/documentConverterService";

/**
 * SchoolMasterlistUploader
 * ============================================================================
 * Dedicated UI component for School Section Masterlist PDF uploading,
 * network-aware animated scanning, automatic per-set payment calculation,
 * direct drag-and-drop re-uploading, data accuracy confirmation modal,
 * and step progression.
 * ============================================================================
 */
export default function SchoolMasterlistUploader({
  masterlistData,
  onMasterlistChange,
  availableTiers = ["Set A", "Set B", "Set C", "Set D"],
  serviceTiers = [],
  packageName = "Senior High Packages and Sets",
  schoolName,
  onSchoolNameChange,
  sectionName,
  onSectionNameChange,
  onBack,
  onNextStep,
  isSavingToDatabase = false
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanPercent, setScanPercent] = useState(0);
  const [scanStage, setScanStage] = useState(0);
  const [scanError, setScanError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentTier, setNewStudentTier] = useState(availableTiers[0] || "Set A");
  const [newStudentMotto, setNewStudentMotto] = useState("");
  const [editingMottoId, setEditingMottoId] = useState(null);
  const [tempMotto, setTempMotto] = useState("");
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showConfirmAccuracyModal, setShowConfirmAccuracyModal] = useState(false);

  // Editable adviser/school fields inside the accuracy confirmation modal if the user wants to refine them
  const [confirmAdviserName, setConfirmAdviserName] = useState("");
  const [confirmAdviserEmail, setConfirmAdviserEmail] = useState("");
  const [confirmAdviserPhone, setConfirmAdviserPhone] = useState("");
  const [confirmSchoolName, setConfirmSchoolName] = useState("");
  const [confirmStrand, setConfirmStrand] = useState("");
  const [confirmSection, setConfirmSection] = useState("");
  const [confirmBatch, setConfirmBatch] = useState("");

  // Real-time Network & I/O Telemetry State for Smart Loading Animation
  const [networkTelemetry, setNetworkTelemetry] = useState({
    effectiveType: "4G",
    downlinkMbps: 10,
    rttMs: 25,
    throughputKbps: 0,
    bytesProcessed: 0,
    totalBytes: 0,
    activeStageLabel: "Initializing Network & Stream Telemetry..."
  });

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const students = masterlistData?.students || [];

  // Normalized list of all displayable Set categories
  const displayTiers = useMemo(() => {
    const base = availableTiers && availableTiers.length > 0 ? availableTiers : ["Set A", "Set B", "Set C", "Set D"];
    return Array.from(new Set([...base, "Set A", "Set B", "Set C", "Set D"]));
  }, [availableTiers]);

  // Live payment & set summary calculation (always stays in sync when sets or students change)
  const paymentBreakdown = useMemo(() => {
    return calculateMasterlistPaymentSummary(
      students,
      displayTiers,
      serviceTiers,
      masterlistData?.selectedPackage || masterlistData?.packageName || packageName
    );
  }, [students, displayTiers, serviceTiers, masterlistData?.selectedPackage, masterlistData?.packageName, packageName]);

  // Recalculate summary counts and set payment totals whenever students or sets change
  const recalculateSummary = (newStudents, baseData = masterlistData) => {
    const pkgLabel =
      baseData?.selectedPackage ||
      baseData?.packageName ||
      packageName ||
      "Senior High Packages and Sets";

    const calculated = calculateMasterlistPaymentSummary(
      newStudents,
      displayTiers,
      serviceTiers,
      pkgLabel
    );

    return {
      ...(baseData || {}),
      selectedPackage: pkgLabel,
      packageName: pkgLabel,
      students: calculated.students,
      totalAmount: calculated.summary.totalAmount,
      downPaymentAmount: calculated.summary.downPaymentAmount,
      remainingBalance: calculated.summary.remainingBalance,
      summary: calculated.summary
    };
  };

  /**
   * Smart Network Traffic & Stream Telemetry Probe
   * Measures real browser Network Information API (downlink, rtt, effectiveType),
   * PerformanceResourceTiming entries, live ping latency, and chunked file stream throughput.
   */
  const measureNetworkAndStreamFile = async (file, onTelemetryUpdate) => {
    const conn =
      typeof navigator !== "undefined"
        ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
        : null;

    let effectiveType = (conn?.effectiveType || "4g").toUpperCase();
    let downlinkMbps = conn?.downlink || 12.5;
    let rttMs = conn?.rtt || 28;

    // Measure actual live network latency from Performance API or origin HEAD probe
    const pingStart = performance.now();
    try {
      const perfEntries = performance.getEntriesByType("resource");
      if (perfEntries && perfEntries.length > 0) {
        const recent = perfEntries.slice(-5);
        const avgDuration =
          recent.reduce((acc, e) => acc + Math.max(5, e.responseEnd - e.startTime), 0) /
          recent.length;
        if (Number.isFinite(avgDuration) && avgDuration > 0) {
          rttMs = Math.round(Math.min(350, Math.max(8, avgDuration * 0.45)));
        }
      }
      if (typeof window !== "undefined" && window.location?.origin) {
        await fetch(`${window.location.origin}/favicon.ico?_t=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store"
        }).catch(() => { });
        const measuredRtt = Math.round(performance.now() - pingStart);
        if (measuredRtt > 0 && measuredRtt < 2000) {
          rttMs = measuredRtt;
          downlinkMbps = Number(Math.max(1.5, Math.min(100, (800 / Math.max(10, measuredRtt)) * 2.4)).toFixed(1));
        }
      }
    } catch {
      // Fallback to navigator.connection metrics
    }

    const totalBytes = file.size || 16384;
    let bytesProcessed = 0;
    const streamStart = performance.now();

    onTelemetryUpdate({
      effectiveType,
      downlinkMbps,
      rttMs,
      throughputKbps: 0,
      bytesProcessed: 0,
      totalBytes,
      percent: 12,
      stage: 1,
      activeStageLabel: `Network ${effectiveType} (${downlinkMbps} Mbps · ${rttMs}ms RTT) — Streaming document bytes...`
    });

    // Stream file bytes in chunks to measure real I/O + network-paced throughput
    if (typeof file.stream === "function") {
      const reader = file.stream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesProcessed += value?.byteLength || 0;
        const elapsedSec = Math.max(0.015, (performance.now() - streamStart) / 1000);
        const throughputKbps = Math.round(bytesProcessed / 1024 / elapsedSec);
        const pct = Math.min(42, 12 + Math.round((bytesProcessed / totalBytes) * 30));

        onTelemetryUpdate({
          effectiveType,
          downlinkMbps,
          rttMs,
          throughputKbps,
          bytesProcessed,
          totalBytes,
          percent: pct,
          stage: 1,
          activeStageLabel: `Streaming PDF buffer (${(bytesProcessed / 1024).toFixed(1)} / ${(totalBytes / 1024).toFixed(1)} KB at ${throughputKbps} KB/s)...`
        });
      }
    } else {
      await file.arrayBuffer();
      bytesProcessed = totalBytes;
    }

    // Adaptive pacing based on real measured network RTT so the multi-stage scanner transitions smoothly
    const adaptiveStepMs = Math.min(380, Math.max(160, rttMs * 4));
    await new Promise((r) => setTimeout(r, adaptiveStepMs));

    const elapsedSec = Math.max(0.02, (performance.now() - streamStart) / 1000);
    const finalThroughputKbps = Math.max(120, Math.round(totalBytes / 1024 / elapsedSec));

    return {
      effectiveType,
      downlinkMbps,
      rttMs,
      throughputKbps: finalThroughputKbps,
      bytesProcessed: totalBytes,
      totalBytes,
      adaptiveStepMs
    };
  };

  /**
   * Process uploaded file (First upload OR direct drag-and-drop second upload).
   * Does NOT store records in the database yet — records are stored only when the
   * customer clicks "Next Step" and confirms in the accuracy modal.
   */
  const handleProcessFile = async (file) => {
    if (!file) return;

    setIsScanning(true);
    setScanError("");
    setScanPercent(8);
    setScanStage(1);
    setScanProgress("Initializing network telemetry & opening document stream...");

    try {
      // Stage 1: Network & File Stream Telemetry
      const netStats = await measureNetworkAndStreamFile(file, (telemetry) => {
        setNetworkTelemetry(telemetry);
        setScanPercent(telemetry.percent);
        setScanStage(telemetry.stage);
        setScanProgress(telemetry.activeStageLabel);
      });

      // Stage 2: Document Format & PDF Coordinate Layer Extraction
      setScanStage(2);
      setScanPercent(58);
      const stage2Label = "Extracting PDF coordinate layers, school metadata & adviser profile...";
      setScanProgress(stage2Label);
      setNetworkTelemetry((prev) => ({
        ...prev,
        ...netStats,
        activeStageLabel: stage2Label
      }));

      await new Promise((r) => setTimeout(r, netStats.adaptiveStepMs));

      const result = await scanSchoolMasterlistPDF(file, displayTiers);

      // Stage 3: Student Roster Validation & Set Pricing Calculation
      setScanStage(3);
      setScanPercent(86);
      const stage3Label = `Detected ${result.students?.length || 0} student records — Calculating Set A–D pricing & validating names...`;
      setScanProgress(stage3Label);
      setNetworkTelemetry((prev) => ({
        ...prev,
        activeStageLabel: stage3Label
      }));

      await new Promise((r) => setTimeout(r, netStats.adaptiveStepMs));

      if (!result.students || result.students.length === 0) {
        setScanError(
          "We could not automatically detect student rows from this file. Please download and use our Official Blank Sheet (.PDF)."
        );
        setIsScanning(false);
        return;
      }

      setScanStage(4);
      setScanPercent(100);
      await new Promise((r) => setTimeout(r, 140));

      const resolvedPackage =
        packageName ||
        result.selectedPackage ||
        result.packageName ||
        "Senior High Packages and Sets";

      const enriched = recalculateSummary(result.students, {
        ...result,
        selectedPackage: resolvedPackage,
        packageName: resolvedPackage,
        fileName: file.name.replace(/\.docx$/i, ".pdf"),
        originalFileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + " KB"
      });

      // Update in-memory state ONLY (Database storage is deferred until Next Step confirmation)
      onMasterlistChange(enriched);

      if (enriched.school && onSchoolNameChange) {
        onSchoolNameChange(enriched.school);
      }
      if (enriched.section && onSectionNameChange) {
        onSectionNameChange(enriched.section);
      }
    } catch (err) {
      console.error("Masterlist scanning failed:", err);
      setScanError(
        err.message || "Failed to parse PDF masterlist. Please make sure to use our Official Blank Sheet (.PDF)."
      );
    } finally {
      setIsScanning(false);
      setScanProgress("");
      setScanPercent(0);
      setScanStage(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Global container drag-and-drop handlers so second/subsequent uploads work directly by drag-and-drop
  // without needing to click "Re-upload PDF"
  const handleContainerDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleContainerDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleContainerDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleContainerDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadBlankTemplate = async (e) => {
    e?.stopPropagation();
    await downloadTemplateAsConvertedDocx({
      school: schoolName || "Name of School",
      strand: masterlistData?.strand || "Academic Strand",
      section: sectionName || "Class Section",
      batch: masterlistData?.batch || "Batch 2026",
      adviserName: masterlistData?.adviserName || "",
      adviserEmail: masterlistData?.adviserEmail || "",
      adviserPhone: masterlistData?.adviserPhone || "",
      packageName: packageName || masterlistData?.selectedPackage || masterlistData?.packageName || "Senior High Packages"
    });
  };

  const handleExportCurrentRoster = (e) => {
    e?.stopPropagation();
    generateMasterlistPDFTemplate({
      school: schoolName || masterlistData?.school || "School Partner",
      strand: masterlistData?.strand || "Academic Strand",
      section: sectionName || masterlistData?.section || "Class Section",
      batch: masterlistData?.batch || "Batch 2026",
      adviserName: masterlistData?.adviserName || "Class Adviser",
      adviserEmail: masterlistData?.adviserEmail || "",
      adviserPhone: masterlistData?.adviserPhone || "",
      packageName: packageName || masterlistData?.selectedPackage || masterlistData?.packageName || "Senior High Packages",
      students: paymentBreakdown.students,
      isSample: false,
      fileName: `Official_Masterlist_${(schoolName || masterlistData?.school || "School").replace(/\s+/g, "_")}_${(sectionName || masterlistData?.section || "Section").replace(/\s+/g, "_")}.pdf`
    });
  };

  // Changing a student's set immediately recalculates all Set cards and overall payment
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
      section: sectionName || masterlistData?.section || "School Section",
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

  // Open the Data Accuracy Confirmation Modal when the user clicks "Next Step"
  const handleOpenConfirmAccuracyModal = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!masterlistData || students.length === 0) {
      setScanError("Please upload your class masterlist PDF before proceeding to the next step.");
      return;
    }

    setConfirmAdviserName(masterlistData.adviserName || "");
    setConfirmAdviserEmail(masterlistData.adviserEmail || "");
    setConfirmAdviserPhone(masterlistData.adviserPhone || "");
    setConfirmSchoolName(schoolName || masterlistData.school || "");
    setConfirmStrand(masterlistData.strand || "");
    setConfirmSection(sectionName || masterlistData.section || "");
    setConfirmBatch(masterlistData.batch || "Batch 2026");
    setShowConfirmAccuracyModal(true);
  };

  // Confirm all data in the modal -> sync final adviser/school/payment data & trigger Next Step DB persistence
  const handleConfirmAndProceed = async () => {
    const finalizedData = recalculateSummary(paymentBreakdown.students, {
      ...masterlistData,
      school: confirmSchoolName.trim() || schoolName || masterlistData?.school || "School Partner",
      strand: confirmStrand.trim() || masterlistData?.strand || "Academic Strand",
      section: confirmSection.trim() || sectionName || masterlistData?.section || "Class Section",
      batch: confirmBatch.trim() || masterlistData?.batch || "Batch 2026",
      adviserName: confirmAdviserName.trim() || masterlistData?.adviserName || "Class Adviser",
      adviserEmail: confirmAdviserEmail.trim() || masterlistData?.adviserEmail || "",
      adviserPhone: confirmAdviserPhone.trim() || masterlistData?.adviserPhone || "",
      selectedPackage:
        packageName ||
        masterlistData?.selectedPackage ||
        masterlistData?.packageName ||
        "Senior High Packages and Sets",
      packageName:
        packageName ||
        masterlistData?.selectedPackage ||
        masterlistData?.packageName ||
        "Senior High Packages and Sets",
      confirmedByAdviser: true,
      confirmedAt: new Date().toISOString()
    });

    onMasterlistChange(finalizedData);
    if (finalizedData.school && onSchoolNameChange) {
      onSchoolNameChange(finalizedData.school);
    }
    if (finalizedData.section && onSectionNameChange) {
      onSectionNameChange(finalizedData.section);
    }

    setShowConfirmAccuracyModal(false);

    if (typeof onNextStep === "function") {
      await onNextStep(finalizedData);
    }
  };

  // Filtered student list by search query
  const filteredStudents = paymentBreakdown.students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.studentNo && s.studentNo.toLowerCase().includes(q)) ||
      (s.packageSet && s.packageSet.toLowerCase().includes(q)) ||
      (s.motto && s.motto.toLowerCase().includes(q))
    );
  });

  const invalidStudentsCount = paymentBreakdown.students.filter((s) => !s.isValidName).length;

  return (
    <div
      onDragEnter={handleContainerDragEnter}
      onDragOver={handleContainerDragOver}
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
      className="relative space-y-6 animate-fade-in"
    >
      {/* Hidden Global File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,application/pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.rtf,*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleProcessFile(e.target.files[0]);
          }
        }}
      />

      {/* ── DIRECT DRAG-AND-DROP OVERLAY FOR SECOND / SUBSEQUENT UPLOADS ── */}
      {isDragging && masterlistData && students.length > 0 && !isScanning && (
        <div className="fixed inset-0 z-[9990] bg-neutral-950/70 backdrop-blur-md flex items-center justify-center p-6 pointer-events-none animate-fade-in">
          <div className="max-w-lg w-full rounded-3xl border-2 border-dashed border-gold bg-neutral-900/95 p-10 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center mx-auto shadow-lg shadow-gold/30">
              <Upload size={30} className="stroke-[2.4]" />
            </div>
            <h3 className="font-heading font-extrabold text-xl text-white">
              Drop New Masterlist PDF to Replace Current Roster
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Release your file anywhere to automatically rescan the updated school section, student sets, and payment calculation.
            </p>
          </div>
        </div>
      )}

      {/* ── SMART NETWORK-AWARE MOVING ANIMATION OVERLAY (WHEN OPENING / SCANNING PDF) ── */}
      {isScanning && (
        <div className="rounded-3xl border border-gold/50 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Ambient Moving Background Grid */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            {/* Top Network Traffic Telemetry Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-neutral-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <Wifi size={13} className="text-gold" />
                <span className="font-bold text-white">
                  NET: {networkTelemetry.effectiveType}
                </span>
                <span className="text-neutral-500">|</span>
                <span>{networkTelemetry.downlinkMbps} Mbps</span>
                <span className="text-neutral-500">|</span>
                <span>RTT {networkTelemetry.rttMs} ms</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Activity size={13} />
                  <span>
                    {networkTelemetry.throughputKbps > 0
                      ? `${networkTelemetry.throughputKbps} KB/s`
                      : "Probing stream..."}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-gold/20 text-gold font-bold border border-gold/30">
                  {scanPercent}%
                </span>
              </div>
            </div>

            {/* Multi-Vector Moving SVG Pipeline Animation (Document Laser Scanner -> Packet Stream -> Orbital Engine -> Roster DB) */}
            <div className="py-2 flex items-center justify-center">
              <svg
                viewBox="0 0 680 190"
                className="w-full max-w-2xl h-40 sm:h-44 overflow-visible"
                aria-label="Animated PDF Masterlist Document Scanner and Network Stream"
              >
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                    <stop offset="50%" stopColor="#FBBF24" stopOpacity="1" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Motion Paths for Streaming Data Packets */}
                  <path
                    id="packetPathUpper"
                    d="M 155 95 C 220 40, 270 40, 340 95 C 410 150, 460 150, 525 95"
                    fill="none"
                  />
                  <path
                    id="packetPathCenter"
                    d="M 155 95 L 525 95"
                    fill="none"
                  />
                  <path
                    id="packetPathLower"
                    d="M 155 95 C 220 150, 270 150, 340 95 C 410 40, 460 40, 525 95"
                    fill="none"
                  />
                </defs>

                {/* Curved Data-Bus Tracks */}
                <use
                  href="#packetPathUpper"
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                <use
                  href="#packetPathCenter"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <use
                  href="#packetPathLower"
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />

                {/* Travelling Data Packets along Upper, Center, and Lower Paths */}
                <circle r="4.5" fill="#FBBF24" filter="url(#glowFilter)">
                  <animateMotion dur="1.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#packetPathUpper" />
                  </animateMotion>
                </circle>
                <circle r="3.5" fill="#10B981" filter="url(#glowFilter)">
                  <animateMotion dur="1.5s" begin="0.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#packetPathUpper" />
                  </animateMotion>
                </circle>

                <circle r="5" fill="#F59E0B" filter="url(#glowFilter)">
                  <animateMotion dur="1.2s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#packetPathCenter" />
                  </animateMotion>
                </circle>
                <circle r="4" fill="#38BDF8" filter="url(#glowFilter)">
                  <animateMotion dur="1.2s" begin="0.6s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#packetPathCenter" />
                  </animateMotion>
                </circle>

                <circle r="4.5" fill="#10B981" filter="url(#glowFilter)">
                  <animateMotion dur="1.6s" begin="0.25s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#packetPathLower" />
                  </animateMotion>
                </circle>
                <circle r="3.5" fill="#FBBF24" filter="url(#glowFilter)">
                  <animateMotion dur="1.6s" begin="0.9s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#packetPathLower" />
                  </animateMotion>
                </circle>

                {/* ── LEFT NODE: PDF DOCUMENT WITH ACTIVE LASER SCANNER ── */}
                <g transform="translate(55, 25)">
                  {/* Back sheet */}
                  <rect
                    x="10"
                    y="6"
                    width="88"
                    height="118"
                    rx="10"
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth="1.5"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="-4 54 65; 2 54 65; -4 54 65"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </rect>

                  {/* Main PDF Sheet */}
                  <rect
                    x="0"
                    y="12"
                    width="90"
                    height="120"
                    rx="10"
                    fill="#0F172A"
                    stroke="url(#goldGrad)"
                    strokeWidth="2.2"
                  />

                  {/* PDF Header Bar */}
                  <rect x="10" y="24" width="46" height="7" rx="3.5" fill="#FBBF24" />
                  <rect x="62" y="24" width="18" height="7" rx="3.5" fill="#334155" />

                  {/* Simulated Student Table Rows Illuminating */}
                  {[42, 55, 68, 81, 94, 107].map((yPos, idx) => (
                    <g key={yPos}>
                      <rect
                        x="10"
                        y={yPos}
                        width="14"
                        height="5"
                        rx="2.5"
                        fill="#475569"
                      />
                      <rect
                        x="28"
                        y={yPos}
                        width="34"
                        height="5"
                        rx="2.5"
                        fill="#64748B"
                      >
                        <animate
                          attributeName="fill"
                          values="#334155;#FBBF24;#10B981;#334155"
                          dur="1.8s"
                          begin={`${idx * 0.22}s`}
                          repeatCount="indefinite"
                        />
                      </rect>
                      <rect
                        x="66"
                        y={yPos}
                        width="14"
                        height="5"
                        rx="2.5"
                        fill="#10B981"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.3;1;0.3"
                          dur="1.4s"
                          begin={`${idx * 0.22}s`}
                          repeatCount="indefinite"
                        />
                      </rect>
                    </g>
                  ))}

                  {/* Sweeping Laser Beam across the PDF Document */}
                  <g>
                    <rect
                      x="-6"
                      y="32"
                      width="102"
                      height="3.5"
                      rx="2"
                      fill="url(#laserGrad)"
                      filter="url(#glowFilter)"
                    >
                      <animate
                        attributeName="y"
                        values="26;118;26"
                        dur="1.65s"
                        repeatCount="indefinite"
                      />
                    </rect>
                  </g>

                  <text
                    x="45"
                    y="152"
                    textAnchor="middle"
                    fill="#E2E8F0"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    PDF STREAM
                  </text>
                </g>

                {/* ── CENTER NODE: MULTI-RING ORBITAL PARSER ENGINE (GitHub svg-loaders style) ── */}
                <g transform="translate(340, 95)">
                  {/* Outer counter-rotating dashed orbit */}
                  <circle
                    r="44"
                    fill="#0F172A"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                  <circle
                    r="40"
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth="2.5"
                    strokeDasharray="36 24 12 24"
                    strokeLinecap="round"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Middle reverse-rotating emerald orbit */}
                  <circle
                    r="29"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeDasharray="22 18"
                    strokeLinecap="round"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="360"
                      to="0"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Inner high-speed quantum ring */}
                  <circle
                    r="18"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    strokeDasharray="14 14"
                    strokeLinecap="round"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="1.1s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Core pulse */}
                  <circle r="8" fill="#FBBF24" filter="url(#glowFilter)">
                    <animate
                      attributeName="r"
                      values="6;10;6"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  <text
                    x="0"
                    y="64"
                    textAnchor="middle"
                    fill="#FBBF24"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ROSTER ENGINE
                  </text>
                </g>

                {/* ── RIGHT NODE: VERIFIED ADVISER & SET CALCULATOR NODE ── */}
                <g transform="translate(525, 30)">
                  <rect
                    x="0"
                    y="10"
                    width="100"
                    height="114"
                    rx="12"
                    fill="#0F172A"
                    stroke="#10B981"
                    strokeWidth="2"
                  />

                  {/* Animated Set Cards inside Right Node */}
                  {[
                    { y: 24, label: "SET A", color: "#FBBF24" },
                    { y: 47, label: "SET B", color: "#38BDF8" },
                    { y: 70, label: "SET C", color: "#A855F7" },
                    { y: 93, label: "SET D", color: "#10B981" }
                  ].map((bar, i) => (
                    <g key={bar.label} transform={`translate(12, ${bar.y})`}>
                      <rect width="76" height="16" rx="4" fill="#1E293B" />
                      <rect
                        x="3"
                        y="3"
                        width="28"
                        height="10"
                        rx="2.5"
                        fill={bar.color}
                      >
                        <animate
                          attributeName="width"
                          values="18;68;42;18"
                          dur="2s"
                          begin={`${i * 0.3}s`}
                          repeatCount="indefinite"
                        />
                      </rect>
                    </g>
                  ))}

                  <text
                    x="50"
                    y="146"
                    textAnchor="middle"
                    fill="#10B981"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    SET &amp; FEE CALC
                  </text>
                </g>
              </svg>
            </div>

            {/* Progress Bar & Stage Steps */}
            <div className="space-y-3">
              <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden p-0.5 border border-neutral-700/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-gold to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.max(8, scanPercent)}%` }}
                />
              </div>

              <div className="text-center space-y-1">
                <h4 className="font-heading font-extrabold text-base sm:text-lg text-white tracking-tight">
                  {scanProgress || networkTelemetry.activeStageLabel}
                </h4>
                <p className="text-xs text-neutral-400 font-body">
                  Inspecting school section metadata, adviser credentials, student sets (Set A–D), and computing total payment...
                </p>
              </div>

              {/* 4 Pipeline Stage Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {[
                  { id: 1, label: "1. Network & Stream", icon: Wifi },
                  { id: 2, label: "2. PDF Layer Scan", icon: Cpu },
                  { id: 3, label: "3. Adviser & Roster", icon: Users },
                  { id: 4, label: "4. Set Payment Calc", icon: Database }
                ].map((st) => {
                  const IconComp = st.icon;
                  const isDone = scanStage > st.id;
                  const isCurrent = scanStage === st.id;
                  return (
                    <div
                      key={st.id}
                      className={`px-3 py-2 rounded-xl border text-[11px] font-mono flex items-center gap-2 transition-all ${isDone
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : isCurrent
                            ? "bg-amber-500/20 border-gold text-gold font-bold shadow-sm"
                            : "bg-neutral-900/60 border-neutral-800 text-neutral-500"
                        }`}
                    >
                      {isDone ? (
                        <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                      ) : (
                        <IconComp
                          size={13}
                          className={isCurrent ? "text-gold animate-pulse shrink-0" : "text-neutral-500 shrink-0"}
                        />
                      )}
                      <span className="truncate">{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CASE 1: NO FILE SCANNED YET ── */}
      {!isScanning && (!masterlistData || students.length === 0) && (
        <div className="space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed py-12 sm:py-16 px-6 sm:px-12 text-center transition-all cursor-pointer ${isDragging
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

            <div className="relative z-10 max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 flex items-center justify-center mx-auto shadow-lg shadow-gold/25 ring-4 ring-gold/20">
                <Upload size={28} className="stroke-[2.3]" />
              </div>

              <div className="space-y-1.5 pt-0.5">
                <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-950 tracking-tight">
                  Upload School Section Masterlist PDF
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 font-body leading-relaxed max-w-md mx-auto">
                  Drag and drop your class masterlist PDF file here, or click to browse from your device.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {/* Browse File Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 px-6 py-2.5 text-xs font-bold tracking-wider shadow-md shadow-gold/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap min-w-[160px]"
                  >
                    <Upload size={14} className="stroke-[2.5]" />
                    <span>Browse PDF File</span>
                  </button>

                  {/* Download Blank Sheet (.PDF) — secretly converts & downloads as editable .docx */}
                  <button
                    type="button"
                    onClick={handleDownloadBlankTemplate}
                    className="px-5 py-2.5 rounded-xl border border-neutral-300 hover:border-gold bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 whitespace-nowrap min-w-[170px]"
                    title="Download Blank Sheet (.PDF)"
                  >
                    <FileText size={14} className="text-amber-700" />
                    <span>Download Blank Sheet (.PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Masterlist Data Requirements Blueprint Strip */}
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white space-y-5 shadow-sm font-body">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center shrink-0">
                  <FileText size={15} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-white">
                    Official Masterlist Data Specification (10 Studio Criteria)
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    All 10 fields below are automatically extracted and verified by the studio scanner
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full self-start sm:self-center">
                Auto-Set Pricing Enabled
              </span>
            </div>

            {/* Group 1: School & Section Header Information */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300/80 uppercase tracking-wider font-mono">
                <School size={13} className="text-gold" />
                <span>Section &amp; Adviser Metadata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Name of School</strong>
                    <span className="text-[11px] text-neutral-400">Full high school, college, or university name</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Academic Strand / Track</strong>
                    <span className="text-[11px] text-neutral-400">e.g. STEM, ABM, HUMSS, TVL, ICT</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Class Section</strong>
                    <span className="text-[11px] text-neutral-400">Official section designation</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Class Adviser Name &amp; Email</strong>
                    <span className="text-[11px] text-neutral-400">All section records are stored under the adviser</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Class Adviser Phone Number</strong>
                    <span className="text-[11px] text-neutral-400">Mobile number for photoshoot coordination</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
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

            {/* Group 2: Individual Student Roster Requirements */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300/80 uppercase tracking-wider font-mono">
                <Users size={13} className="text-gold" />
                <span>Student Roster Entry Requirements (Per Row)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    7
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Student ID Number</strong>
                    <span className="text-[11px] text-neutral-400">Official school-issued student identifier</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 sm:col-span-1 lg:col-span-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    8
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">
                      Complete Student Name
                    </strong>
                    <span className="text-[11px] text-neutral-400 block mt-0.5 leading-relaxed">
                      Must include First Name, Middle Name (or Initial), and Last Name (e.g. <em>Santos, Maria Clara P.</em>).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    9
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-[12.5px]">Student Set Category</strong>
                    <span className="text-[11px] text-neutral-400">Assigned package set: Set A, Set B, Set C, or Set D</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-neutral-300 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 sm:col-span-1 lg:col-span-2">
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
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed">
                <strong>Upload Notice:</strong> {scanError}
              </div>
            </div>
          )}

          {/* Back & Next Step Navigation Buttons (Case 1) */}
          <div className="pt-4 border-t border-neutral-200/70 flex items-center justify-between gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="btn-outline px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer hover:border-gold hover:text-gold transition-colors"
              >
                <ArrowLeft size={15} /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleOpenConfirmAccuracyModal}
              disabled={!masterlistData || students.length === 0}
              className="btn-primary flex items-center gap-2 px-8 py-2.5 text-xs font-bold tracking-wider shadow-warm-sm justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next Step</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── CASE 2: MASTERLIST LOADED & ORGANIZED OVERVIEW ── */}
      {!isScanning && masterlistData && students.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Reorganized Clean Header & Set Payment Card (No "Masterlist Scanned" badge) */}
          <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-white via-neutral-50/70 to-amber-50/30 border border-gold/40 shadow-sm relative overflow-hidden space-y-6">
            {/* Golden top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

            {/* 1. Top Row: School Identity & Action Toolbar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center shrink-0 shadow-md border border-gold/40">
                  <School size={24} className="stroke-[2.3]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-extrabold text-lg sm:text-2xl text-neutral-950 truncate tracking-tight">
                    {schoolName || masterlistData.school || "School Section Partner"}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-neutral-900 text-gold font-heading font-bold text-xs">
                      {masterlistData.strand || "Academic Strand"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-heading font-semibold text-xs">
                      Section: {sectionName || masterlistData.section || "Class Section"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100/80 border border-amber-200 text-amber-900 font-heading font-bold text-xs">
                      {masterlistData.batch || "Batch 2026"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleExportCurrentRoster}
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:border-gold bg-white hover:bg-amber-50/40 text-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Export verified masterlist to PDF"
                >
                  <Download size={13} className="text-amber-700" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gold border border-gold/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:border-gold bg-white hover:bg-amber-50/40 text-neutral-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Or simply drag and drop a new file anywhere on this section"
                >
                  <RefreshCw size={13} />
                  <span>Re-upload PDF</span>
                </button>
              </div>
            </div>

            {/* 2. Middle Row: Structured 4-Column Adviser & Package Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70">
              {/* Adviser Name */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/90 border border-amber-200/50 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Class Adviser (Record Owner)
                  </span>
                  <strong className="text-xs sm:text-sm font-heading font-bold text-neutral-950 truncate block mt-0.5">
                    {masterlistData.adviserName || "Class Adviser"}
                  </strong>
                </div>
              </div>

              {/* Selected Package */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/90 border border-amber-200/50 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Package size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Selected Package
                  </span>
                  <strong className="text-xs sm:text-sm font-heading font-bold text-amber-900 truncate block mt-0.5">
                    {masterlistData.selectedPackage || masterlistData.packageName || packageName}
                  </strong>
                </div>
              </div>

              {/* Adviser Email */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/90 border border-amber-200/50 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Adviser Email
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 truncate block mt-0.5">
                    {masterlistData.adviserEmail || "Not specified"}
                  </span>
                </div>
              </div>

              {/* Adviser Phone */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/90 border border-amber-200/50 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Adviser Phone
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 truncate block mt-0.5">
                    {masterlistData.adviserPhone || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Name Validation Alert Banner (if any names missing middle/last name) */}
            {invalidStudentsCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Validation Notice:</strong> {invalidStudentsCount} student(s) in this masterlist have an incomplete name (missing middle name or last name). Please review their names below.
                </div>
              </div>
            )}

            {/* 3. Bottom Row: Organized Student Set Cards & Automatic Payment Calculation */}
            <div className="space-y-3 pt-2 border-t border-neutral-200/70">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Card 1: Total Students */}
                <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                      Total Students
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-gold/15 text-amber-800 flex items-center justify-center">
                      <Users size={14} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-heading font-black text-neutral-950 text-xl leading-none block">
                      {paymentBreakdown.summary.total}
                    </span>
                    <span className="text-[10.5px] text-emerald-700 font-semibold mt-1 block">
                      {paymentBreakdown.summary.validStudents} verified
                    </span>
                  </div>
                </div>

                {/* Cards 2–5: Set A, Set B, Set C, Set D with Live Counts, Unit Price & Subtotals */}
                {["Set A", "Set B", "Set C", "Set D"].map((tier) => {
                  const count = paymentBreakdown.summary.setCounts?.[tier] || 0;
                  const unitPrice = paymentBreakdown.summary.unitPrices?.[tier] || 0;
                  const subtotal = paymentBreakdown.summary.setSubtotals?.[tier] || 0;
                  const sharePct =
                    paymentBreakdown.summary.total > 0
                      ? Math.round((count / paymentBreakdown.summary.total) * 100)
                      : 0;
                  const isActive = count > 0;

                  return (
                    <div
                      key={tier}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${isActive
                          ? "border-amber-300 bg-gradient-to-b from-amber-50/60 to-white shadow-xs"
                          : "border-neutral-200/80 bg-white/80 opacity-80"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] uppercase tracking-wider text-neutral-900 font-extrabold font-heading">
                          {tier}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${isActive
                              ? "bg-amber-200/80 text-amber-950"
                              : "bg-neutral-100 text-neutral-400"
                            }`}
                        >
                          {sharePct}%
                        </span>
                      </div>

                      <div className="my-2 flex items-baseline justify-between">
                        <span className="font-heading font-black text-neutral-950 text-xl leading-none">
                          {count}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          × ₱{unitPrice.toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400 font-medium">Subtotal</span>
                        <strong className={isActive ? "text-amber-900 font-mono" : "text-neutral-400 font-mono"}>
                          ₱{subtotal.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  );
                })}

                {/* Card 6: Overall Adviser Payment Card */}
                <div className="p-3.5 rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-md flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold font-mono">
                      Overall Payment
                    </span>
                    <CreditCard size={14} className="text-gold" />
                  </div>
                  <div className="my-1.5">
                    <span className="font-heading font-black text-gold text-lg sm:text-xl leading-none block">
                      ₱{paymentBreakdown.summary.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[10.5px] text-neutral-300">
                    <span>50% Deposit:</span>
                    <strong className="text-white font-mono">
                      ₱{paymentBreakdown.summary.downPaymentAmount.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Roster Table Container (Cleaned: Removed "Filter Set: All (5) Set A-D") */}
          <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
            {/* Clean Table Search & Summary Header Bar */}
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
                  placeholder="Search student name, ID, set, or motto..."
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-semibold text-neutral-900 outline-none transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-600">
                <span className="font-medium">
                  Tip: Change any student&apos;s <strong>Set Category</strong> below to automatically recalculate set cards &amp; total payment.
                </span>
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
                    <th className="py-3 px-4">Set Price</th>
                    <th className="py-3 px-4">Yearbook Motto</th>
                    <th className="py-3 px-4 text-center">Name Validation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-body">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400">
                        <Users size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">No students match your search query</p>
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

                        {/* Student Complete Name */}
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

                        {/* Package Set Dropdown (Immediately reflects in cards & payment total) */}
                        <td className="py-3.5 px-4">
                          <select
                            value={student.packageSet}
                            onChange={(e) => handleUpdateStudentTier(student.id, e.target.value)}
                            className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50/60 font-heading font-bold text-xs text-neutral-950 outline-none focus:ring-2 focus:ring-gold/30 cursor-pointer shadow-2xs"
                          >
                            {["Set A", "Set B", "Set C", "Set D"].map((tier) => (
                              <option key={tier} value={tier}>
                                {tier}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Unit Set Price */}
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-900">
                          ₱{(student.unitPrice || paymentBreakdown.summary.unitPrices?.[student.packageSet] || 0).toLocaleString()}
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
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold">
                  Showing {filteredStudents.length} of {paymentBreakdown.students.length} students
                </span>
                <span className="text-neutral-300">|</span>
                <span className="font-mono font-bold text-neutral-900">
                  Adviser Total Order: ₱{paymentBreakdown.summary.totalAmount.toLocaleString()}
                </span>
              </div>
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

          {/* ── STEP NAVIGATION FOOTER: BACK & NEXT STEP BUTTONS ── */}
          <div className="pt-4 border-t border-neutral-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>
                You can drag and drop another PDF file anytime to replace this roster. Records are only saved to the database once you confirm <strong>Next Step</strong>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 shrink-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isSavingToDatabase}
                  className="btn-outline px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer hover:border-gold hover:text-gold transition-colors"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenConfirmAccuracyModal}
                disabled={isSavingToDatabase}
                className="btn-primary flex items-center gap-2 px-8 py-2.5 text-xs font-bold tracking-wider shadow-warm-sm justify-center cursor-pointer"
              >
                {isSavingToDatabase ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving Records...</span>
                  </>
                ) : (
                  <>
                    <span>Next Step</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM ALL MASTERLIST & PAYMENT DATA ACCURACY BEFORE NEXT STEP ── */}
      {showConfirmAccuracyModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-body"
          onClick={() => !isSavingToDatabase && setShowConfirmAccuracyModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-gold/40 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center shrink-0 shadow-md">
                  <UserCheck size={22} className="stroke-[2.3]" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-amber-700 block">
                    Data Accuracy Verification
                  </span>
                  <h3 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-950">
                    Confirm Adviser, School &amp; Payment Details
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    All records and the official masterlist PDF will be saved under the Class Adviser&apos;s name.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmAccuracyModal(false)}
                disabled={isSavingToDatabase}
                className="w-8 h-8 rounded-full border border-neutral-200 hover:border-neutral-300 text-neutral-400 hover:text-neutral-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 1. Adviser & School Editable Verification Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <BookOpen size={14} className="text-amber-700" />
                <span>1. Class Adviser &amp; School Section Record</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 text-xs">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Class Adviser Name (Database Record Owner) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmAdviserName}
                    onChange={(e) => setConfirmAdviserName(e.target.value)}
                    placeholder="e.g. Ms. Lory Glory"
                    className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-semibold text-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Name of School <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmSchoolName}
                    onChange={(e) => setConfirmSchoolName(e.target.value)}
                    placeholder="e.g. Alpaco Senior High School"
                    className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-semibold text-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Adviser Email Address
                  </label>
                  <input
                    type="email"
                    value={confirmAdviserEmail}
                    onChange={(e) => setConfirmAdviserEmail(e.target.value)}
                    placeholder="adviser@school.edu.ph"
                    className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-mono text-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Adviser Phone Number
                  </label>
                  <input
                    type="text"
                    value={confirmAdviserPhone}
                    onChange={(e) => setConfirmAdviserPhone(e.target.value)}
                    placeholder="09XX-XXX-XXXX"
                    className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-mono text-neutral-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Strand / Track</label>
                    <input
                      type="text"
                      value={confirmStrand}
                      onChange={(e) => setConfirmStrand(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-semibold text-neutral-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Class Section</label>
                    <input
                      type="text"
                      value={confirmSection}
                      onChange={(e) => setConfirmSection(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-semibold text-neutral-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Batch</label>
                    <input
                      type="text"
                      value={confirmBatch}
                      onChange={(e) => setConfirmBatch(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold font-semibold text-neutral-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Student Set Breakdown & Automatic Payment Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-amber-700" />
                  <span>2. Student Set Breakdown &amp; Adviser Payment Calculation</span>
                </h4>
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  {paymentBreakdown.summary.total} Students Enrolled
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-200 overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-600 font-mono text-[11px] uppercase">
                      <th className="py-2.5 px-4">Set Category</th>
                      <th className="py-2.5 px-4 text-center">Students</th>
                      <th className="py-2.5 px-4 text-right">Price per Student</th>
                      <th className="py-2.5 px-4 text-right">Set Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {["Set A", "Set B", "Set C", "Set D"].map((tier) => {
                      const count = paymentBreakdown.summary.setCounts?.[tier] || 0;
                      const unit = paymentBreakdown.summary.unitPrices?.[tier] || 0;
                      const sub = paymentBreakdown.summary.setSubtotals?.[tier] || 0;
                      return (
                        <tr key={tier} className={count > 0 ? "bg-amber-50/30 font-semibold" : "text-neutral-400"}>
                          <td className="py-2.5 px-4 font-heading text-neutral-900">{tier}</td>
                          <td className="py-2.5 px-4 text-center font-mono">{count}</td>
                          <td className="py-2.5 px-4 text-right font-mono">₱{unit.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-neutral-900">₱{sub.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-900 text-white font-heading">
                      <td colSpan={3} className="py-3 px-4 font-bold text-xs uppercase tracking-wider">
                        Overall Payment to be Paid by Adviser
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-base text-gold">
                        ₱{paymentBreakdown.summary.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-neutral-800 text-neutral-300 text-[11px] font-mono">
                      <td colSpan={3} className="py-2 px-4">
                        50% Reservation Downpayment (Due at Checkout)
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-amber-300">
                        ₱{paymentBreakdown.summary.downPaymentAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Database & PDF Storage Notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
              <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Database Archival Ready:</strong> Confirming below will store the official Masterlist PDF file, the Class Adviser&apos;s profile (<strong>{confirmAdviserName || "Class Adviser"}</strong>), school metadata, and all <strong>{paymentBreakdown.summary.total} student records</strong> in the database and advance to Schedule Selection.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowConfirmAccuracyModal(false)}
                disabled={isSavingToDatabase}
                className="px-5 py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-400 text-neutral-700 font-bold text-xs transition-all cursor-pointer"
              >
                Go Back &amp; Edit
              </button>

              <button
                type="button"
                onClick={handleConfirmAndProceed}
                disabled={isSavingToDatabase || !confirmAdviserName.trim() || !confirmSchoolName.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-neutral-950 font-heading font-extrabold text-xs shadow-md shadow-gold/25 flex items-center gap-2 cursor-pointer hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {isSavingToDatabase ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Storing PDF &amp; Records...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} className="stroke-[2.5]" />
                    <span>Confirm All Data &amp; Proceed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
                  * Must include First, Middle (or Initial), and Last name.
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
                  {["Set A", "Set B", "Set C", "Set D"].map((t) => (
                    <option key={t} value={t}>
                      {t} (₱{(paymentBreakdown.summary.unitPrices?.[t] || 0).toLocaleString()})
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
                  Download the official Blank Sheet template to fill out your section details and student roster.
                </p>
                <div className="flex items-center gap-2.5 pl-8 pt-0.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadBlankTemplate}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:border-gold bg-white text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileText size={13} className="text-amber-700" />
                    <span>Download Blank Sheet (.PDF)</span>
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
                    Upload &amp; Confirm
                  </strong>
                </div>
                <p className="text-neutral-600 leading-relaxed pl-8">
                  Drop your completed file into the upload box. The scanner will automatically detect every student&apos;s set and calculate the overall payment for the adviser.
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
