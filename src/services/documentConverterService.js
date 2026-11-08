/**
 * documentConverterService.js
 * ============================================================================
 * Silent Background Document Converter API & Universal Format Bridge
 *
 * Purpose:
 *   1. Template Download (PDF -> Secretly Converted to Editable .DOCX):
 *      - The user clicks "Download Blank Sheet (.PDF)", expecting the standard template.
 *      - Behind the scenes, the converter builds the PDF specification and silently
 *        delivers the converted `.docx` document so that when opened in Microsoft Word,
 *        every table cell is 100% editable (never flattened into an uneditable image).
 *
 *   2. Masterlist Upload (All Formats Accepted -> Prioritizes PDF -> Converts Others to PDF):
 *      - Primarily prioritizes `.pdf` files directly.
 *      - When a user uploads a completed `.docx` template (or any other document format
 *        such as `.doc`, `.csv`, `.txt`, `.rtf`, `.xlsx`, `.xls`), this service silently
 *        converts the uploaded document into a real `.pdf` File (`application/pdf`)
 *        so the PDF scanner reads the PDF file seamlessly.
 * ============================================================================
 */

import JSZip from "jszip";
import {
  buildMasterlistPDFDoc,
  generateMasterlistDocxTemplate,
  generateMasterlistPDFFile,
  validateStudentCompleteName
} from "./masterlistTemplateService.js";
import {
  scanSchoolMasterlistDocx,
  parseMasterlistRoster
} from "./pdfMasterlistScannerService.js";

const CONVERTER_API_ENDPOINT =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_DOCUMENT_CONVERTER_API_URL) ||
  "https://v2.convertapi.com/convert";

const CONVERTER_API_SECRET =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_DOCUMENT_CONVERTER_API_KEY) ||
  "";

/**
 * 1. Secretly converts the PDF template request into an editable .docx download.
 *    We still build the canonical PDF template specification first, then convert
 *    and trigger the .docx download so MS Word opens it as editable tables.
 */
export async function downloadTemplateAsConvertedDocx(options = {}) {
  // Build the canonical PDF representation in memory first
  buildMasterlistPDFDoc({
    ...options,
    isSample: false
  });

  // Convert and trigger download as editable .docx
  return generateMasterlistDocxTemplate(options);
}

/**
 * Checks if a File/Blob/ArrayBuffer is already a native PDF document.
 * Inspects file extension, MIME type, and `%PDF-` magic header bytes.
 */
export async function isPdfDocument(fileOrBuffer) {
  if (!fileOrBuffer) return false;

  if (typeof fileOrBuffer.name === "string" && fileOrBuffer.name.toLowerCase().endsWith(".pdf")) {
    return true;
  }
  if (typeof fileOrBuffer.type === "string" && fileOrBuffer.type.toLowerCase().includes("pdf")) {
    return true;
  }

  try {
    const buffer =
      fileOrBuffer instanceof ArrayBuffer
        ? fileOrBuffer.slice(0, 5)
        : typeof fileOrBuffer.slice === "function"
          ? await fileOrBuffer.slice(0, 5).arrayBuffer()
          : null;

    if (buffer && buffer.byteLength >= 4) {
      const header = new TextDecoder("ascii").decode(new Uint8Array(buffer));
      if (header.startsWith("%PDF")) {
        return true;
      }
    }
  } catch {
    // Ignore header inspection errors
  }

  return false;
}

/**
 * Checks if a File/Blob/ArrayBuffer is a Word (.docx) document.
 */
export async function isDocxDocument(fileOrBuffer) {
  if (!fileOrBuffer) return false;

  if (typeof fileOrBuffer.name === "string" && fileOrBuffer.name.toLowerCase().endsWith(".docx")) {
    return true;
  }
  if (
    typeof fileOrBuffer.type === "string" &&
    fileOrBuffer.type.toLowerCase().includes("wordprocessingml")
  ) {
    return true;
  }

  try {
    const arrayBuffer =
      fileOrBuffer instanceof ArrayBuffer
        ? fileOrBuffer
        : typeof fileOrBuffer.arrayBuffer === "function"
          ? await fileOrBuffer.arrayBuffer()
          : null;

    if (arrayBuffer && arrayBuffer.byteLength > 4) {
      const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
      // PK\x03\x04 ZIP signature
      if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        if (zip.file("word/document.xml")) {
          return true;
        }
      }
    }
  } catch {
    // Not a valid docx zip
  }

  return false;
}

/**
 * Checks if a File/Blob/ArrayBuffer is an Excel (.xlsx) workbook.
 */
async function isXlsxDocument(fileOrBuffer) {
  if (!fileOrBuffer) return false;

  if (typeof fileOrBuffer.name === "string" && fileOrBuffer.name.toLowerCase().endsWith(".xlsx")) {
    return true;
  }
  if (
    typeof fileOrBuffer.type === "string" &&
    fileOrBuffer.type.toLowerCase().includes("spreadsheetml")
  ) {
    return true;
  }

  try {
    const arrayBuffer =
      fileOrBuffer instanceof ArrayBuffer
        ? fileOrBuffer
        : typeof fileOrBuffer.arrayBuffer === "function"
          ? await fileOrBuffer.arrayBuffer()
          : null;

    if (arrayBuffer && arrayBuffer.byteLength > 4) {
      const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
      if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        if (zip.file("xl/workbook.xml")) {
          return true;
        }
      }
    }
  } catch {
    // Not an xlsx zip
  }

  return false;
}

/**
 * Extracts text lines from an Excel (.xlsx) file using JSZip so it can be converted to PDF.
 */
async function extractTextFromXlsx(fileOrBuffer) {
  const arrayBuffer =
    fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

  const zip = await JSZip.loadAsync(arrayBuffer);

  // Read sharedStrings if present
  const sharedStrings = [];
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async("string");
    const siMatches = ssXml.match(/<si[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const text = tMatches
        .map((t) => t.replace(/<[^>]+>/g, ""))
        .join("")
        .trim();
      sharedStrings.push(text);
    }
  }

  // Read first worksheet
  const sheetFile =
    zip.file("xl/worksheets/sheet1.xml") ||
    Object.values(zip.files).find((f) => f.name.startsWith("xl/worksheets/sheet"));

  if (!sheetFile) return "";

  const sheetXml = await sheetFile.async("string");
  const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];
  const lines = [];

  for (const rowXml of rowMatches) {
    const cellMatches = rowXml.match(/<c[\s\S]*?<\/c>/g) || [];
    const rowValues = [];
    for (const cXml of cellMatches) {
      const isShared = /t="s"/.test(cXml);
      const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/);
      const isMatch = cXml.match(/<is[\s\S]*?<\/is>/);
      if (vMatch) {
        const rawVal = vMatch[1].trim();
        if (isShared) {
          const idx = parseInt(rawVal, 10);
          rowValues.push(sharedStrings[idx] ?? rawVal);
        } else {
          rowValues.push(rawVal);
        }
      } else if (isMatch) {
        const tMatches = isMatch[0].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
        rowValues.push(tMatches.map((t) => t.replace(/<[^>]+>/g, "")).join(""));
      }
    }
    const line = rowValues.map((v) => String(v || "").trim()).filter(Boolean).join("   ");
    if (line) lines.push(line);
  }

  return lines.join("\n");
}

/**
 * Parses plain text, CSV, TSV, RTF, or legacy .doc text into masterlist data.
 */
function parseTextOrCsvMasterlist(rawText, validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  // Clean RTF control words if the user uploaded an .rtf file
  let cleanedText = rawText || "";
  if (cleanedText.trim().startsWith("{\\rtf")) {
    cleanedText = cleanedText
      .replace(/\\par\b/g, "\n")
      .replace(/\\tab\b/g, "   ")
      .replace(/\\[a-z]+\d*\s?/gi, "")
      .replace(/[{}]/g, "");
  }

  // First try the standard roster parser
  const parsed = parseMasterlistRoster(cleanedText, [], validTiers);
  if (parsed.students && parsed.students.length > 0) {
    return parsed;
  }

  // Fallback for delimited CSV/TSV rows (e.g., "#,Student ID,Name,Set,Motto")
  const lines = cleanedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const students = [];

  for (const line of lines) {
    if (/STUDENT\s*ID|COMPLETE\s*NAME|YEARBOOK\s*MOTTO/i.test(line)) continue;
    const cols = line.includes("\t")
      ? line.split("\t").map((c) => c.trim())
      : line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());

    if (cols.length >= 3) {
      let studentNo = "";
      let name = "";
      let set = "Set A";
      let motto = "";

      if (cols.length >= 5 && /^\d+$/.test(cols[0])) {
        studentNo = cols[1];
        name = `${cols[2]}, ${cols[3]}`;
        set = cols[4] || "Set A";
        motto = cols.slice(5).join(", ");
      } else if (cols.length >= 4) {
        studentNo = cols[0];
        name = cols[1];
        set = cols[2] || "Set A";
        motto = cols.slice(3).join(", ");
      } else {
        name = cols[0];
        set = cols[1] || "Set A";
        motto = cols[2] || "";
      }

      if (name && name.length >= 3) {
        const validation = validateStudentCompleteName(name);
        students.push({
          id: students.length + 1,
          studentNo: studentNo || `2026-${String(students.length + 101).padStart(4, "0")}`,
          name: validation.formatted || name,
          packageSet: validTiers.find((t) => t.toLowerCase() === set.toLowerCase()) || validTiers[0] || "Set A",
          motto,
          section: parsed.section || "Class Section",
          strand: parsed.strand || "Academic Strand",
          isValidName: validation.isValid,
          validationError: validation.isValid ? null : validation.reason,
          status: validation.isValid ? "verified" : "invalid_name"
        });
      }
    }
  }

  return {
    ...parsed,
    success: students.length > 0,
    students
  };
}

/**
 * Optional remote Converter API call if VITE_DOCUMENT_CONVERTER_API_KEY is configured.
 * Falls back gracefully to the built-in client-side PDF conversion engine.
 */
async function tryExternalConverterApiToPdf(file) {
  if (!CONVERTER_API_SECRET || typeof fetch === "undefined" || !(file instanceof Blob)) {
    return null;
  }

  try {
    const ext = (file.name || "document.docx").split(".").pop().toLowerCase();
    const formData = new FormData();
    formData.append("File", file, file.name || `document.${ext}`);

    const response = await fetch(`${CONVERTER_API_ENDPOINT}/${ext}/to/pdf?Secret=${CONVERTER_API_SECRET}`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) return null;
    const data = await response.json();
    const fileUrl = data?.Files?.[0]?.Url;
    if (!fileUrl) return null;

    const pdfResp = await fetch(fileUrl);
    if (!pdfResp.ok) return null;
    const pdfBlob = await pdfResp.blob();
    const baseName = (file.name || "Masterlist").replace(/\.[^.]+$/, "");
    return new File([pdfBlob], `${baseName}.pdf`, { type: "application/pdf" });
  } catch {
    return null;
  }
}

/**
 * 2. Universal Document-to-PDF Converter Pipeline:
 *    - Prioritizes `.pdf` files first (returns them untouched with `wasConverted: false`).
 *    - For `.docx` (and any other uploaded file format like `.xlsx`, `.csv`, `.txt`, `.rtf`, `.doc`),
 *      converts the document into an actual `.pdf` File (`application/pdf`) so that the
 *      masterlist PDF scanner reads the PDF file directly.
 */
export async function convertDocumentToPdfFile(
  fileOrBuffer,
  validTiers = ["Set A", "Set B", "Set C", "Set D"]
) {
  // 1. PRIORITY: Native PDF files are prioritized and returned immediately
  if (await isPdfDocument(fileOrBuffer)) {
    return {
      pdfFile: fileOrBuffer,
      wasConverted: false,
      sourceFormat: "pdf",
      extractedData: null
    };
  }

  const originalName =
    (fileOrBuffer && typeof fileOrBuffer.name === "string" && fileOrBuffer.name) ||
    "School_Masterlist_Upload";
  const targetPdfFileName = `${originalName.replace(/\.[^.]+$/, "")}.pdf`;

  // 2. Word (.docx) Template -> Convert to PDF File
  if (await isDocxDocument(fileOrBuffer)) {
    const extractedData = await scanSchoolMasterlistDocx(fileOrBuffer, validTiers);

    const pdfFile = generateMasterlistPDFFile({
      school: extractedData.school,
      strand: extractedData.strand,
      section: extractedData.section,
      batch: extractedData.batch,
      adviserName: extractedData.adviserName,
      adviserEmail: extractedData.adviserEmail,
      adviserPhone: extractedData.adviserPhone,
      packageName: extractedData.selectedPackage || extractedData.packageName,
      students: extractedData.students,
      isSample: false,
      fileName: targetPdfFileName
    });

    return {
      pdfFile,
      wasConverted: true,
      sourceFormat: "docx",
      extractedData
    };
  }

  // 3. Excel (.xlsx) Workbook -> Convert to PDF File
  if (await isXlsxDocument(fileOrBuffer)) {
    const xlsxText = await extractTextFromXlsx(fileOrBuffer);
    const extractedData = parseTextOrCsvMasterlist(xlsxText, validTiers);

    const pdfFile = generateMasterlistPDFFile({
      school: extractedData.school,
      strand: extractedData.strand,
      section: extractedData.section,
      batch: extractedData.batch,
      adviserName: extractedData.adviserName,
      adviserEmail: extractedData.adviserEmail,
      adviserPhone: extractedData.adviserPhone,
      packageName: extractedData.selectedPackage || extractedData.packageName,
      students: extractedData.students,
      isSample: false,
      fileName: targetPdfFileName
    });

    return {
      pdfFile,
      wasConverted: true,
      sourceFormat: "xlsx",
      extractedData
    };
  }

  // 4. Optional External Converter API (if configured)
  const externalPdf = await tryExternalConverterApiToPdf(fileOrBuffer);
  if (externalPdf) {
    return {
      pdfFile: externalPdf,
      wasConverted: true,
      sourceFormat: "external_api",
      extractedData: null
    };
  }

  // 5. Fallback for CSV, TXT, RTF, DOC, or any text-bearing document -> Convert to PDF File
  let rawText = "";
  if (typeof fileOrBuffer?.text === "function") {
    rawText = await fileOrBuffer.text();
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    rawText = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(fileOrBuffer));
  } else if (typeof fileOrBuffer?.arrayBuffer === "function") {
    const buf = await fileOrBuffer.arrayBuffer();
    rawText = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
  }

  const extractedData = parseTextOrCsvMasterlist(rawText, validTiers);
  const pdfFile = generateMasterlistPDFFile({
    school: extractedData.school,
    strand: extractedData.strand,
    section: extractedData.section,
    batch: extractedData.batch,
    adviserName: extractedData.adviserName,
    adviserEmail: extractedData.adviserEmail,
    adviserPhone: extractedData.adviserPhone,
    packageName: extractedData.selectedPackage || extractedData.packageName,
    students: extractedData.students,
    isSample: false,
    fileName: targetPdfFileName
  });

  return {
    pdfFile,
    wasConverted: true,
    sourceFormat: "text_fallback",
    extractedData
  };
}

/**
 * 3. Automatic Payment & Set Breakdown Calculator for School Masterlists.
 *    Detects the sets selected by each student (Set A, Set B, Set C, Set D) and
 *    calculates the per-set subtotals and overall payment to be paid by the adviser.
 */
export function calculateMasterlistPaymentSummary(
  students = [],
  availableTiers = ["Set A", "Set B", "Set C", "Set D"],
  serviceTiers = [],
  packageName = "Senior High Packages and Sets"
) {
  const isCollege = /college/i.test(packageName || "");

  const defaultPrices = isCollege
    ? {
        "Set A": 4875,
        "Set B": 3575,
        "Set C": 2450,
        "Set D": 1750
      }
    : {
        "Set A": 1750,
        "Set B": 1425,
        "Set C": 1100,
        "Set D": 795
      };

  const parseNumericPrice = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  // Ensure all 4 standard sets (or availableTiers) have resolved unit prices
  const safeAvailableTiers = Array.isArray(availableTiers)
    ? availableTiers
    : ["Set A", "Set B", "Set C", "Set D"];
  const allTiers = Array.from(new Set([...safeAvailableTiers, "Set A", "Set B", "Set C", "Set D"]));
  const unitPrices = {};
  const setCounts = {};
  const setSubtotals = {};

  allTiers.forEach((tier) => {
    const matchedTierObj = (serviceTiers || []).find(
      (t) => t?.name && t.name.trim().toLowerCase() === tier.trim().toLowerCase()
    );
    const catalogPrice = matchedTierObj ? parseNumericPrice(matchedTierObj.price) : 0;
    unitPrices[tier] = catalogPrice > 0 ? catalogPrice : defaultPrices[tier] || 795;
    setCounts[tier] = 0;
    setSubtotals[tier] = 0;
  });

  let validStudents = 0;
  let invalidStudents = 0;
  let totalAmount = 0;

  const enrichedStudents = (students || []).map((s, idx) => {
    const setKey =
      allTiers.find((t) => t.toLowerCase() === String(s.packageSet || "Set A").trim().toLowerCase()) ||
      s.packageSet ||
      availableTiers[0] ||
      "Set A";
    const unitPrice = unitPrices[setKey] ?? defaultPrices[setKey] ?? 795;

    setCounts[setKey] = (setCounts[setKey] || 0) + 1;
    setSubtotals[setKey] = (setSubtotals[setKey] || 0) + unitPrice;
    totalAmount += unitPrice;

    if (s.isValidName) validStudents++;
    else invalidStudents++;

    return {
      ...s,
      id: s.id || idx + 1,
      packageSet: setKey,
      unitPrice
    };
  });

  const downPaymentAmount = Math.round(totalAmount * 0.5);
  const remainingBalance = Math.max(0, totalAmount - downPaymentAmount);

  return {
    students: enrichedStudents,
    summary: {
      total: enrichedStudents.length,
      validStudents,
      invalidStudents,
      setCounts,
      setSubtotals,
      unitPrices,
      totalAmount,
      downPaymentAmount,
      remainingBalance
    }
  };
}

/**
 * 4. Generates the canonical Masterlist PDF File reflecting all current adviser/school/student
 *    records and uploads it to Supabase Storage + stores adviser/masterlist metadata in DB.
 *    Called ONLY when the customer triggers and confirms the Next Step button.
 */
export async function persistConfirmedMasterlistToDatabase(
  masterlistData,
  { supabaseClient = null, userId = null, packageName = "Senior High Packages and Sets" } = {}
) {
  const safeSchool = (masterlistData?.school || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const safeSection = (masterlistData?.section || "Section").replace(/[^a-zA-Z0-9]/g, "_");
  const safeAdviser = (masterlistData?.adviserName || "Adviser").replace(/[^a-zA-Z0-9]/g, "_");
  const canonicalPdfName = `Official_Masterlist_${safeAdviser}_${safeSchool}_${safeSection}.pdf`;

  // Always build an up-to-date PDF file reflecting any in-table edits made by the adviser
  const pdfFile = generateMasterlistPDFFile({
    school: masterlistData?.school || "School Partner",
    strand: masterlistData?.strand || "Academic Strand",
    section: masterlistData?.section || "Class Section",
    batch: masterlistData?.batch || "Batch 2026",
    adviserName: masterlistData?.adviserName || "Class Adviser",
    adviserEmail: masterlistData?.adviserEmail || "",
    adviserPhone: masterlistData?.adviserPhone || "",
    packageName:
      masterlistData?.selectedPackage ||
      masterlistData?.packageName ||
      packageName ||
      "Senior High Packages and Sets",
    students: masterlistData?.students || [],
    isSample: false,
    fileName: canonicalPdfName
  });

  let pdfStoragePath = null;
  let pdfPublicUrl = null;

  if (supabaseClient && userId) {
    const timestamp = Date.now();
    const targetPath = `masterlists/${userId}/${timestamp}_${canonicalPdfName}`;

    // Try uploading to public studio-assets bucket first so a direct public URL is available,
    // and also upload to booking-references for booking attachment compatibility.
    try {
      const { data: pubData, error: pubErr } = await supabaseClient.storage
        .from("studio-assets")
        .upload(targetPath, pdfFile, {
          contentType: "application/pdf",
          upsert: true
        });

      if (!pubErr && pubData?.path) {
        pdfStoragePath = pubData.path;
        const { data: urlData } = supabaseClient.storage
          .from("studio-assets")
          .getPublicUrl(pubData.path);
        pdfPublicUrl = urlData?.publicUrl || null;
      }
    } catch (e) {
      console.warn("[Masterlist Storage] studio-assets upload fallback:", e);
    }

    try {
      const refPath = `${userId}/${timestamp}_${canonicalPdfName}`;
      const { data: refData, error: refErr } = await supabaseClient.storage
        .from("booking-references")
        .upload(refPath, pdfFile, {
          contentType: "application/pdf",
          upsert: true
        });

      if (!refErr && refData?.path && !pdfStoragePath) {
        pdfStoragePath = refData.path;
      }
    } catch (e) {
      console.warn("[Masterlist Storage] booking-references upload fallback:", e);
    }

    // Store the confirmed adviser & school section masterlist snapshot under the user's profile studio_specs
    try {
      const { data: existingProfile } = await supabaseClient
        .from("profiles")
        .select("studio_specs")
        .eq("id", userId)
        .maybeSingle();

      const currentSpecs = existingProfile?.studio_specs || {};
      const updatedSpecs = {
        ...currentSpecs,
        latest_school_masterlist: {
          confirmed_at: new Date().toISOString(),
          adviser_name: masterlistData?.adviserName || "",
          adviser_email: masterlistData?.adviserEmail || "",
          adviser_phone: masterlistData?.adviserPhone || "",
          school: masterlistData?.school || "",
          strand: masterlistData?.strand || "",
          section: masterlistData?.section || "",
          batch: masterlistData?.batch || "",
          selected_package:
            masterlistData?.selectedPackage ||
            masterlistData?.packageName ||
            packageName,
          masterlist_pdf_name: canonicalPdfName,
          masterlist_pdf_path: pdfStoragePath,
          masterlist_pdf_url: pdfPublicUrl,
          summary: masterlistData?.summary || {},
          students: masterlistData?.students || []
        }
      };

      await supabaseClient
        .from("profiles")
        .update({ studio_specs: updatedSpecs })
        .eq("id", userId);
    } catch (profErr) {
      console.warn("[Masterlist Profile Sync] Non-fatal warning:", profErr);
    }
  }

  return {
    pdfFile,
    pdfFileName: canonicalPdfName,
    pdfStoragePath,
    pdfPublicUrl
  };
}
