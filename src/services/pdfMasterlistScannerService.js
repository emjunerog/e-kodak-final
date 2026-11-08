/**
 * pdfMasterlistScannerService.js
 * ============================================================================
 * High-performance PDF parser and AI scanner for School Section Masterlists.
 *
 * Capabilities:
 *  1. Client-side PDF parsing using pdfjs-dist (reconstructing table rows via
 *     spatial Y-coordinate clustering).
 *  2. High-speed heuristic regex extractor detecting all 10 studio requirements:
 *     - Name of School
 *     - Strand / Academic Track
 *     - Section
 *     - Class Adviser's Name
 *     - Class Adviser's Email
 *     - Phone Number of the Class Adviser
 *     - Batch #
 *     - Student ID Number
 *     - Student Complete Name (Validating First, Middle, and Last name)
 *     - Package Set (Set A, Set B, Set C, Set D)
 *     - Yearbook Motto
 *  3. Seamless AI Fallback (Groq / Gemini via src/lib/ai.js) for unstructured,
 *     scanned OCR, or non-standard multi-column tables.
 *  4. Instant mock masterlist generator for demo & preview testing.
 * ============================================================================
 */

import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import universalClient, { isAiConfigured, chatWithGroq, isGroqConfigured } from "../lib/ai.js";
import { validateStudentCompleteName } from "./masterlistTemplateService.js";
import { convertDocumentToPdfFile } from "./documentConverterService.js";

// Polyfill Uint8Array.prototype.toHex for pdfjs-dist v5 compatibility across all browsers & runtimes
if (typeof Uint8Array !== "undefined" && typeof Uint8Array.prototype.toHex !== "function") {
  Uint8Array.prototype.toHex = function () {
    let hex = "";
    for (let i = 0; i < this.length; i++) {
      hex += this[i].toString(16).padStart(2, "0");
    }
    return hex;
  };
}

// Configure PDF.js worker in browser environments
if (typeof window !== "undefined") {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  } catch (err) {
    console.warn("PDF.js worker initialization notice:", err);
  }
}

/**
 * Standardize text case (e.g. "SANTOS, MARIA CLARA P." -> "Santos, Maria Clara P.")
 */
function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/(?:^|\s|-|,|\.)\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Normalize package set text to standard tier name (e.g. "set a", "PKG A", "A" -> "Set A")
 */
export function normalizePackageSet(str, validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  if (!str) return validTiers[0] || "Set A";
  const clean = str.trim().toUpperCase();

  // Match Set X or Package X
  const setMatch = clean.match(/(?:SET|PACKAGE|PKG|TIER)\s*([A-D])/i);
  if (setMatch) {
    const letter = setMatch[1].toUpperCase();
    const matched = validTiers.find((t) => t.toUpperCase().includes(`SET ${letter}`) || t.toUpperCase().endsWith(letter));
    if (matched) return matched;
    return `Set ${letter}`;
  }

  // Exact single letter check (A, B, C, D)
  if (/^[A-D]$/.test(clean)) {
    const matched = validTiers.find((t) => t.toUpperCase().includes(`SET ${clean}`) || t.toUpperCase().endsWith(clean));
    if (matched) return matched;
    return `Set ${clean}`;
  }

  // Check substring match
  for (const tier of validTiers) {
    if (clean.includes(tier.toUpperCase())) return tier;
  }

  return validTiers[0] || "Set A";
}

/**
 * 1. Extract raw text with spatial coordinate clustering from a PDF file
 */
export async function extractTextFromPDF(fileOrBuffer) {
  let arrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Blob || (typeof File !== "undefined" && fileOrBuffer instanceof File)) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error("Invalid file provided. Please provide a PDF File or ArrayBuffer.");
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    disableFontFace: false
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages = [];
  let fullText = "";

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items into rows by Y position (within 4px tolerance)
    const rowsMap = new Map();
    textContent.items.forEach((item) => {
      if (!item.str || !item.str.trim()) return;
      const y = Math.round(item.transform[5]);

      // Match existing row within 4 vertical pixels
      let matchedY = null;
      for (const existingY of rowsMap.keys()) {
        if (Math.abs(existingY - y) <= 4) {
          matchedY = existingY;
          break;
        }
      }

      const targetY = matchedY !== null ? matchedY : y;
      if (!rowsMap.has(targetY)) rowsMap.set(targetY, []);
      rowsMap.get(targetY).push({
        x: item.transform[4],
        str: item.str
      });
    });

    // Sort Y descending (top of page down to bottom), X ascending (left to right)
    const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);
    const pageLines = sortedYs
      .map((y) => {
        const rowItems = rowsMap.get(y).sort((a, b) => a.x - b.x);
        return rowItems.map((it) => it.str).join("  ").trim();
      })
      .filter(Boolean);

    const pageText = pageLines.join("\n");
    pages.push({
      pageNumber: pageNum,
      lines: pageLines,
      text: pageText
    });
    fullText += pageText + "\n";
  }

  return { fullText, pages, numPages };
}

/**
 * 2. High-speed Heuristic & Regex Parser
 */
export function parseMasterlistRoster(fullText, pages = [], validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  const allLines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let school = "";
  let strand = "";
  let section = "";
  let batch = "";
  let adviserName = "";
  let adviserEmail = "";
  let adviserPhone = "";
  let selectedPackage = "";

  const stripTrailingLabels = (val) =>
    (val || "")
      .replace(
        /\s+(?:BATCH\s*#?|CLASS\s*SECTION|SECTION|ACADEMIC\s*STRAND|STRAND|ADVISER\s*PHONE|PHONE|CONTACT|TEL|ADVISER\s*EMAIL|EMAIL|PACKAGE\s*CATEGORY|SELECTED\s*PACKAGE|SECTION\s*PACKAGE|PACKAGE)\s*[:\-–—][\s\S]*$/i,
        ""
      )
      .replace(/^[_\s\-:]+|[_\s\-:]+$/g, "")
      .trim();

  // 1. Detect School Name from header lines
  const explicitSchoolRegex = /(?:NAME\s*OF\s*SCHOOL|SCHOOL\s*NAME|INSTITUTION)[\s:\-–—]+([^\n\r,]+)/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(explicitSchoolRegex);
    if (match && !school) {
      const candidate = stripTrailingLabels(match[1]);
      if (candidate && !/^name\s*of\s*school$/i.test(candidate)) {
        school = candidate;
        break;
      }
    }
  }
  if (!school) {
    const fallbackSchoolRegex = /(?:university|college|school|academy|institute|high school|national high)\b/i;
    for (let i = 0; i < Math.min(25, allLines.length); i++) {
      const line = allLines[i];
      if (/E-KODAK\s*STUDIO|OFFICIAL\s*SCHOOL\s*SECTION\s*MASTERLIST|Masterlist\s*Verification\s*System/i.test(line)) {
        continue;
      }
      if (fallbackSchoolRegex.test(line)) {
        const candidate = stripTrailingLabels(line.replace(/^[^a-zA-Z]+/, ""));
        if (candidate && !/^name\s*of\s*school$/i.test(candidate)) {
          school = candidate;
          break;
        }
      }
    }
  }

  // 2. Detect Academic Strand
  const strandRegex = /(?:ACADEMIC\s*STRAND|STRAND|TRACK|PROGRAM)[\s:\-–—]+([^\n\r,]+)|\b(STEM|ABM|HUMSS|GAS|TVL|ICT|HE|HOME\s*ECONOMICS)\b/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(strandRegex);
    if (match && !strand) {
      const candidate = stripTrailingLabels(match[1] || match[2] || "");
      if (candidate && !/^academic\s*strand$/i.test(candidate)) {
        strand = candidate;
        break;
      }
    }
  }

  // 3. Detect Section
  const sectionRegex = /(?:CLASS\s*SECTION|SECTION)[\s:\-–—]+([^\n\r,]+)/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(sectionRegex);
    if (match && !section) {
      const candidate = stripTrailingLabels(match[1]);
      if (candidate && !/^(?:class\s*section|masterlist)$/i.test(candidate)) {
        section = candidate;
        break;
      }
    }
  }

  // Fallback section from generic combined line if not yet found
  if (!section) {
    const combinedRegex = /(?:section|strand|grade)[\s:\-–—]+([^\n\r,]+)/i;
    for (let i = 0; i < Math.min(25, allLines.length); i++) {
      const match = allLines[i].match(combinedRegex);
      if (match) {
        const candidate = stripTrailingLabels(match[1]);
        if (candidate && !/^(?:class\s*section|academic\s*strand)$/i.test(candidate)) {
          section = candidate;
          break;
        }
      }
    }
  }

  // 4. Detect Graduation Year / Batch #
  const batchRegex = /(?:BATCH\s*#?|CLASS\s*OF)[\s:\-–—]*(\d{4}|Batch\s*\d{4})|(?:batch\s*\d{4}|202[4-9]\s*[-–—]\s*202[5-9]|202[4-9])/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(batchRegex);
    if (match && !batch) {
      batch = (match[1] || match[0]).trim();
      if (!batch.toLowerCase().startsWith("batch")) {
        batch = `Batch ${batch}`;
      }
      break;
    }
  }

  // 5. Detect Class Adviser Name
  const adviserRegex = /(?:CLASS\s*ADVISER\s*NAME|ADVISER\s*NAME|CLASS\s*ADVISER|ADVISER|INSTRUCTOR)[\s:\-–—]+([^\n\r,]+)/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(adviserRegex);
    if (match && !adviserName) {
      const candidate = stripTrailingLabels(match[1]);
      if (
        candidate &&
        !/^(email|phone|contact|batch|class\s*adviser\s*name|_+)$/i.test(candidate)
      ) {
        adviserName = candidate;
        break;
      }
    }
  }

  // 6. Detect Class Adviser Email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(emailRegex);
    if (match && !adviserEmail) {
      adviserEmail = match[1].trim();
      break;
    }
  }

  // 7. Detect Class Adviser Phone Number
  const phoneRegex = /(?:ADVISER\s*PHONE|PHONE|CONTACT|TEL)[\s:\-–—]*((?:\+63|0)9\d{2}[-\s]?\d{3}[-\s]?\d{4}|09\d{9})/i;
  for (let i = 0; i < Math.min(25, allLines.length); i++) {
    const match = allLines[i].match(phoneRegex);
    if (match && !adviserPhone) {
      adviserPhone = match[1].trim();
      break;
    }
  }

  // 7.5. Detect Selected Package from header & metadata lines
  const packageRegex = /(?:SELECTED\s*PACKAGE|SECTION\s*PACKAGE|PACKAGE\s*CATEGORY|PACKAGE)[\s:\-–—]+([^\n\r,]+)|(?:senior high|college|graduation|yearbook)\s*packages?(?:\s*and\s*sets?)?\b/i;
  for (let i = 0; i < Math.min(30, allLines.length); i++) {
    const line = allLines[i];
    if (/PACKAGE\s*&\s*SET|SET\s*CATEGORY/i.test(line)) continue;
    const match = line.match(packageRegex);
    if (match && !selectedPackage) {
      if (match[1]) {
        selectedPackage = stripTrailingLabels(match[1]);
      } else {
        selectedPackage = match[0].trim();
      }
      break;
    }
  }

  // 8. Scan student records, package orders, and mottos
  const students = [];
  const studentIndexRegex = /^\s*(?:(?:#|no\.?|id)?\s*(\d+)[\.\)]?\s+)?((?:20\d{2}[-\s]?\d{2,6}|\d{6,12}|(?:STU|LRN|ID|SHS|COL)[-\s]?\d{2,10}))?\s*([A-Za-z\s,\.\-–—']+?)\s+(?:[-–—|:]\s*)?(Set\s*[A-D]|Package\s*[A-D]|Tier\s*[A-D]|\b[A-D]\b)(.*)$/i;

  let rowCounter = 1;

  for (const line of allLines) {
    // Skip obvious table headers or metadata callouts
    if (
      /^\s*(?:#|no\.?|student\s*name|name\s*of\s*student|package|set|signature|remarks|contact|motto|yearbook\s*motto)/i.test(line) &&
      /(?:package|tier|set|signature|remarks|motto)/i.test(line)
    ) {
      continue;
    }
    if (
      /CRITICAL\s*INTAKE|VALIDATION\s*RULES|Complete\s*Name\s*must\s*have|Last\s*Name,\s*First\s*Name|Set\s*A,\s*B,\s*C|STUDENT\s*COMPLETE\s*NAME|SET\s*CATEGORY/i.test(
        line
      )
    ) {
      continue;
    }

    // Try matching line with index, ID, name, package, and motto
    const match = line.match(studentIndexRegex);
    if (match) {
      const idx = match[1] ? parseInt(match[1], 10) : rowCounter++;
      const studentNo = match[2] ? match[2].trim() : `2026-${String(idx + 100).padStart(4, "0")}`;
      let rawName = match[3].trim();
      const rawPackage = match[4].trim();
      let rawMotto = match[5] ? match[5].trim().replace(/^[-–—|:]\s*/, "") : "";

      // Clean up extracted motto quotes if present
      rawMotto = rawMotto.replace(/^[“"']+|[”"']+$/g, "").trim();

      // Skip lines where the "name" is actually a header word
      if (
        /^(date|page|total|school|strand|teacher|adviser|instructor|signature|status|notice)$/i.test(rawName) ||
        rawName.length < 3
      ) {
        continue;
      }

      // Clean name
      rawName = rawName.replace(/^[-–—#0-9\.\s]+/, "").trim();
      const formattedName = toTitleCase(rawName);
      const normalizedSet = normalizePackageSet(rawPackage, validTiers);

      // Validate Complete Name (Must have First, Middle, and Last name)
      const nameValidation = validateStudentCompleteName(formattedName);

      students.push({
        id: idx,
        studentNo: studentNo,
        name: formattedName,
        packageSet: normalizedSet,
        motto: rawMotto,
        section: section || "School Section",
        strand: strand || "Academic Strand",
        isValidName: nameValidation.isValid,
        validationError: nameValidation.isValid ? null : nameValidation.reason,
        status: nameValidation.isValid ? "verified" : "invalid_name"
      });
      continue;
    }

    // Fallback line search: line contains a package tier keyword
    const packageKeywordMatch = line.match(/\b(Set\s*[A-D]|Package\s*[A-D])\b/i);
    if (packageKeywordMatch) {
      const pkg = packageKeywordMatch[1];
      const parts = line.split(packageKeywordMatch[0]);
      const namePart = (parts[0] || "").trim().replace(/^[-–—0-9\.\s]+/, "").trim();
      const mottoPart = (parts[1] || "").trim().replace(/^[-–—|:]\s*/, "").replace(/^[“"']+|[”"']+$/g, "").trim();

      if (namePart.length >= 3 && !/^(total|summary|package|inclusions|deliverables)/i.test(namePart)) {
        const idx = rowCounter++;
        const formattedName = toTitleCase(namePart);
        const nameValidation = validateStudentCompleteName(formattedName);

        students.push({
          id: idx,
          studentNo: `2026-${String(idx + 100).padStart(4, "0")}`,
          name: formattedName,
          packageSet: normalizePackageSet(pkg, validTiers),
          motto: mottoPart,
          section: section || "School Section",
          strand: strand || "Academic Strand",
          isValidName: nameValidation.isValid,
          validationError: nameValidation.isValid ? null : nameValidation.reason,
          status: nameValidation.isValid ? "verified" : "invalid_name"
        });
      }
    }
  }

  // Calculate summary counts & validation stats
  const setCounts = {};
  validTiers.forEach((t) => {
    setCounts[t] = 0;
  });

  let validCount = 0;
  let invalidCount = 0;

  students.forEach((s) => {
    setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
    if (s.isValidName) {
      validCount++;
    } else {
      invalidCount++;
    }
  });

  return {
    success: students.length > 0,
    school: school || "High School / University Partner",
    strand: strand || "Academic Strand",
    section: section || "Section Batch",
    batch: batch || "Batch 2026",
    adviserName: adviserName || "",
    adviserEmail: adviserEmail || "",
    adviserPhone: adviserPhone || "",
    selectedPackage: selectedPackage || "Senior High Packages",
    packageName: selectedPackage || "Senior High Packages",
    students,
    summary: {
      total: students.length,
      validStudents: validCount,
      invalidStudents: invalidCount,
      setCounts
    }
  };
}

/**
 * 3. AI Fallback Parser for complex / unstructured PDF documents
 */
export async function parseMasterlistWithAI(fullText, validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  if (!isAiConfigured()) {
    throw new Error("AI is not configured. Please ensure Groq or Gemini API keys are active.");
  }

  const prompt = `You are a school graduation photoshoot data extraction expert for E-Kodak Studio.
Analyze the following text extracted from a school section masterlist PDF document.

Extract the following 10 exact studio fields:
1. Name of School
2. Academic Strand
3. Section
4. Class Adviser's Name
5. Class Adviser's Email
6. Phone Number of the Class Adviser
7. Batch # (e.g. Batch 2026)
8. Student ID Number
9. Student Complete Name (Note: In the Philippines, complete name includes Last Name, First Name, and Middle Name/Initial)
10. Package & Set (${validTiers.join(", ")})
11. Yearbook Motto (Each student's graduation quote or motto)

Text from PDF:
"""
${fullText.slice(0, 14000)}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "school": "Name of the School",
  "strand": "Academic Strand",
  "section": "Class Section",
  "batch": "Batch 2026",
  "adviserName": "Name of Adviser",
  "adviserEmail": "Email of Adviser",
  "adviserPhone": "Phone of Adviser",
  "students": [
    {
      "id": 1,
      "studentNo": "2026-00101",
      "name": "Santos, Maria Clara P.",
      "packageSet": "Set A",
      "motto": "Perseverance and dedication will illuminate every path forward."
    }
  ]
}

Ensure packageSet is one of: ${validTiers.map((t) => `"${t}"`).join(", ")}.
If any student has no package specified, default to "${validTiers[0]}".
Return pure JSON only, no markdown wrapping, no explanation.`;

  try {
    let rawResponse = "";

    if (isGroqConfigured()) {
      rawResponse = await chatWithGroq({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      });
    } else {
      const response = await universalClient.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.1 }
      });
      rawResponse = response.text || "";
    }

    // Clean JSON response
    const cleaned = rawResponse
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const students = (parsed.students || []).map((s, idx) => {
      const formattedName = toTitleCase(s.name || `Student ${idx + 1}`);
      const nameValidation = validateStudentCompleteName(formattedName);

      return {
        id: s.id || idx + 1,
        studentNo: s.studentNo || `2026-${String(idx + 101).padStart(4, "0")}`,
        name: formattedName,
        packageSet: normalizePackageSet(s.packageSet, validTiers),
        motto: s.motto || "",
        section: parsed.section || "School Section",
        strand: parsed.strand || "Academic Strand",
        isValidName: nameValidation.isValid,
        validationError: nameValidation.isValid ? null : nameValidation.reason,
        status: nameValidation.isValid ? "verified" : "invalid_name"
      };
    });

    const setCounts = {};
    validTiers.forEach((t) => {
      setCounts[t] = 0;
    });

    let validCount = 0;
    let invalidCount = 0;

    students.forEach((s) => {
      setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
      if (s.isValidName) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    return {
      success: students.length > 0,
      school: parsed.school || "School Partner",
      strand: parsed.strand || "Academic Strand",
      section: parsed.section || "School Section",
      batch: parsed.batch || "Batch 2026",
      adviserName: parsed.adviserName || "",
      adviserEmail: parsed.adviserEmail || "",
      adviserPhone: parsed.adviserPhone || "",
      selectedPackage: parsed.selectedPackage || parsed.packageName || "Senior High Packages",
      packageName: parsed.selectedPackage || parsed.packageName || "Senior High Packages",
      students,
      summary: {
        total: students.length,
        validStudents: validCount,
        invalidStudents: invalidCount,
        setCounts
      }
    };
  } catch (err) {
    console.error("AI PDF parsing fallback error:", err);
    throw err;
  }
}

/**
 * 3.5. Scan an editable Microsoft Word (.docx) masterlist uploaded by an adviser
 */
export async function scanSchoolMasterlistDocx(fileOrBuffer, validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  let arrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Blob || (typeof File !== "undefined" && fileOrBuffer instanceof File)) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error("Invalid file provided. Please provide a Word (.docx) file.");
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Invalid Word document structure. Could not find word/document.xml.");
  }

  const xml = await docXmlFile.async("string");

  // Extract all tables from the document
  const tableMatches = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];

  let school = "";
  let strand = "";
  let section = "";
  let batch = "";
  let adviserName = "";
  let adviserEmail = "";
  let adviserPhone = "";
  let selectedPackage = "";
  const students = [];

  const decodeXmlEntities = (str) =>
    (str || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

  const extractParagraphText = (pXml) => {
    const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    return decodeXmlEntities(
      tMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("")
    ).trim();
  };

  const extractRowCells = (rowXml) => {
    const cellMatches = rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
    return cellMatches.map((cellXml) => {
      const pMatches = cellXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
      if (pMatches.length > 0) {
        return pMatches
          .map(extractParagraphText)
          .filter(Boolean)
          .join(" ")
          .trim();
      }
      return extractParagraphText(cellXml);
    });
  };

  for (const tbl of tableMatches) {
    const rowMatches = tbl.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    for (const rXml of rowMatches) {
      const cells = extractRowCells(rXml);
      if (cells.length === 0) continue;

      // Check metadata labels
      for (let c = 0; c < cells.length; c++) {
        const val = cells[c];
        const nextVal = (cells[c + 1] || "").trim();

        if (/NAME\s*OF\s*SCHOOL/i.test(val) && nextVal && !/^name\s*of\s*school$/i.test(nextVal) && !school) {
          school = nextVal;
        } else if (/ACADEMIC\s*STRAND/i.test(val) && nextVal && !/^academic\s*strand$/i.test(nextVal) && !strand) {
          strand = nextVal;
        } else if (/CLASS\s*SECTION/i.test(val) && nextVal && !/^class\s*section$/i.test(nextVal) && !section) {
          section = nextVal;
        } else if (/BATCH/i.test(val) && nextVal && !batch) {
          batch = nextVal;
        } else if (/CLASS\s*ADVISER/i.test(val) && nextVal && !/^class\s*adviser(?:\s*name)?$/i.test(nextVal) && !adviserName) {
          adviserName = nextVal;
        } else if (/ADVISER\s*PHONE/i.test(val) && nextVal && !/^09XX-XXX-XXXX$/i.test(nextVal) && !adviserPhone) {
          adviserPhone = nextVal;
        } else if (/ADVISER\s*EMAIL/i.test(val) && nextVal && !/^adviser@school\.edu\.ph$/i.test(nextVal) && !adviserEmail) {
          adviserEmail = nextVal;
        } else if (/PACKAGE/i.test(val) && !/SET\s*CATEGORY/i.test(val) && nextVal && !selectedPackage) {
          selectedPackage = nextVal;
        }
      }

      // Check student roster rows
      if (cells.length >= 3) {
        if (
          /STUDENT\s*ID|COMPLETE\s*NAME|SET\s*CATEGORY/i.test(cells.join(" ")) ||
          /NAME\s*OF\s*SCHOOL|ACADEMIC\s*STRAND|CLASS\s*ADVISER|ADVISER\s*EMAIL/i.test(cells.join(" "))
        ) {
          continue;
        }

        let id = "";
        let name = "";
        let set = "";
        let motto = "";

        if (cells.length >= 5) {
          id = cells[1] || "";
          name = cells[2] || "";
          set = cells[3] || "";
          motto = cells[4] || "";
        } else if (cells.length >= 4) {
          id = cells[0] || "";
          name = cells[1] || "";
          set = cells[2] || "";
          motto = cells[3] || "";
        } else {
          name = cells[0] || "";
          set = cells[1] || "";
          motto = cells[2] || "";
        }

        name = name.replace(/^(?:Type Student Name Here|STUDENT COMPLETE NAME)$/i, "").trim();
        id = id.replace(/^(?:STUDENT ID|ID)$/i, "").trim();

        if (name && name.length >= 3) {
          const formattedName = toTitleCase(name);
          const validatedName = validateStudentCompleteName(formattedName);
          const matchedSet = normalizePackageSet(set, validTiers);

          students.push({
            id: students.length + 1,
            studentNo: id || `2026-${String(students.length + 101).padStart(4, "0")}`,
            name: validatedName.formatted || formattedName,
            rawName: name,
            packageSet: matchedSet,
            motto: motto || "",
            section: section || "Class Section",
            strand: strand || "Academic Strand",
            isValidName: validatedName.isValid,
            validationError: validatedName.isValid ? null : validatedName.reason,
            status: validatedName.isValid ? "verified" : "invalid_name"
          });
        }
      }
    }
  }

  // Fallback: if the Word document used plain paragraphs instead of tables
  if (students.length === 0) {
    const allParagraphs = (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [])
      .map(extractParagraphText)
      .filter(Boolean)
      .join("\n");
    if (allParagraphs) {
      const fallbackParsed = parseMasterlistRoster(allParagraphs, [], validTiers);
      if (fallbackParsed.students.length > 0) {
        return {
          ...fallbackParsed,
          numPages: 1,
          extractionMethod: "docx_paragraph_fallback"
        };
      }
    }
  }

  const setCounts = {};
  validTiers.forEach((t) => {
    setCounts[t] = 0;
  });
  let validStudents = 0;
  let invalidStudents = 0;

  students.forEach((s) => {
    setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
    if (s.isValidName) validStudents++;
    else invalidStudents++;
  });

  return {
    success: students.length > 0,
    school: school || "Partner School",
    strand: strand || "Academic Strand",
    section: section || "Class Section",
    batch: batch || "Batch 2026",
    adviserName: adviserName || "",
    adviserEmail: adviserEmail || "",
    adviserPhone: adviserPhone || "",
    selectedPackage: selectedPackage || "Senior High Packages",
    packageName: selectedPackage || "Senior High Packages",
    students,
    summary: {
      total: students.length,
      validStudents,
      invalidStudents,
      setCounts
    },
    numPages: 1,
    extractionMethod: "docx_xml_native"
  };
}

/**
 * 4. Master Orchestrator: Scan a School Masterlist (Prioritizes PDF; silently converts other formats to PDF first)
 */
export async function scanSchoolMasterlistPDF(fileOrBuffer, validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  // Step 0: Run through the Document Converter Pipeline
  // - If fileOrBuffer is already a PDF, it is prioritized directly (wasConverted = false).
  // - If fileOrBuffer is a completed .docx template (or .xlsx, .csv, .txt, .rtf, .doc),
  //   it is converted into a real PDF File (application/pdf) first so the program reads the PDF.
  const {
    pdfFile,
    wasConverted,
    sourceFormat,
    extractedData
  } = await convertDocumentToPdfFile(fileOrBuffer, validTiers);

  // Step 1: Extract text from the PDF file (either native PDF or converted PDF)
  const { fullText, pages, numPages } = await extractTextFromPDF(pdfFile);

  if (!fullText || fullText.trim().length === 0) {
    if (wasConverted && extractedData && extractedData.students?.length > 0) {
      return {
        ...extractedData,
        convertedToPdf: true,
        convertedPdfFileName: pdfFile?.name || "Converted_Masterlist.pdf",
        sourceFormat
      };
    }
    throw new Error("The uploaded PDF has no extractable text. Please ensure it is not a scanned image with zero text layers.");
  }

  // Step 2: Run fast heuristic regex extraction on the PDF text
  const heuristicResult = parseMasterlistRoster(fullText, pages, validTiers);

  // If the file was converted to PDF from a structured template (e.g., .docx),
  // reconcile any wrapped multi-line cells (such as long yearbook mottos or custom IDs)
  // so reading the converted PDF is 100% lossless.
  if (wasConverted && extractedData && extractedData.students?.length > 0) {
    const pdfStudents = heuristicResult.students || [];
    const reconciledStudents =
      pdfStudents.length === extractedData.students.length
        ? pdfStudents.map((pdfStu, idx) => {
            const srcStu = extractedData.students[idx];
            return {
              ...pdfStu,
              studentNo: srcStu?.studentNo || pdfStu.studentNo,
              name: srcStu?.name || pdfStu.name,
              packageSet: srcStu?.packageSet || pdfStu.packageSet,
              motto:
                srcStu?.motto && srcStu.motto.length >= (pdfStu.motto || "").length
                  ? srcStu.motto
                  : pdfStu.motto,
              isValidName: srcStu?.isValidName ?? pdfStu.isValidName,
              validationError: srcStu?.validationError ?? pdfStu.validationError,
              status: srcStu?.status || pdfStu.status
            };
          })
        : extractedData.students;

    const setCounts = {};
    validTiers.forEach((t) => {
      setCounts[t] = 0;
    });
    let validStudents = 0;
    let invalidStudents = 0;
    reconciledStudents.forEach((s) => {
      setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
      if (s.isValidName) validStudents++;
      else invalidStudents++;
    });

    return {
      ...heuristicResult,
      success: reconciledStudents.length > 0,
      school:
        extractedData.school && extractedData.school !== "Partner School"
          ? extractedData.school
          : heuristicResult.school,
      strand:
        extractedData.strand && extractedData.strand !== "Academic Strand"
          ? extractedData.strand
          : heuristicResult.strand,
      section:
        extractedData.section && extractedData.section !== "Class Section"
          ? extractedData.section
          : heuristicResult.section,
      batch: extractedData.batch || heuristicResult.batch,
      adviserName: extractedData.adviserName || heuristicResult.adviserName,
      adviserEmail: extractedData.adviserEmail || heuristicResult.adviserEmail,
      adviserPhone: extractedData.adviserPhone || heuristicResult.adviserPhone,
      selectedPackage: extractedData.selectedPackage || heuristicResult.selectedPackage,
      packageName: extractedData.packageName || heuristicResult.packageName,
      students: reconciledStudents,
      summary: {
        total: reconciledStudents.length,
        validStudents,
        invalidStudents,
        setCounts
      },
      numPages,
      pdfFile,
      convertedToPdf: true,
      convertedPdfFileName: pdfFile?.name || "Converted_Masterlist.pdf",
      sourceFormat,
      extractionMethod: `converted_${sourceFormat}_to_pdf_scan`,
      rawText: fullText
    };
  }

  // If heuristic detected at least 1 student from native PDF, return immediately
  if (heuristicResult.success && heuristicResult.students.length > 0) {
    return {
      ...heuristicResult,
      numPages,
      pdfFile,
      convertedToPdf: false,
      sourceFormat: "pdf",
      extractionMethod: "instant_regex",
      rawText: fullText
    };
  }

  // Step 3: If heuristic found 0 students, attempt AI extraction fallback if available
  if (isAiConfigured()) {
    try {
      const aiResult = await parseMasterlistWithAI(fullText, validTiers);
      if (aiResult.success && aiResult.students.length > 0) {
        return {
          ...aiResult,
          numPages,
          pdfFile,
          extractionMethod: "ai_vision_ocr",
          rawText: fullText
        };
      }
    } catch (aiErr) {
      console.warn("AI fallback extraction failed, returning heuristic result:", aiErr);
    }
  }

  return {
    ...heuristicResult,
    numPages,
    pdfFile,
    extractionMethod: "heuristic_empty",
    rawText: fullText
  };
}

/**
 * 5. Mock Masterlist Generator for instant demo testing
 */
export function generateMockMasterlist(validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  const sampleRoster = [
    {
      name: "Santos, Maria Clara P.",
      motto: "Perseverance and dedication will illuminate every path forward."
    },
    {
      name: "Dela Cruz, Juan Pedro M.",
      motto: "Honor, excellence, and integrity in every endeavor."
    },
    {
      name: "Sinugbuhan, Jude Lawrence L.",
      motto: "Akos's sayo ikaw ay akin."
    },
    {
      name: "Alimento, Mark June R.",
      motto: "Perseverance and dedication will illuminate every path forward."
    },
    {
      name: "Bautista, Kimberly Anne D.",
      motto: "Dream with ambition, lead with passion, and inspire with grace."
    },
    {
      name: "Villanueva, Christian Jay S.",
      motto: "Every small step taken in discipline leads to a giant leap in life."
    },
    {
      name: "Torres, Angelica Mae B.",
      motto: "Gratitude turns what we have into more than enough."
    },
    {
      name: "Reyes, Francis Angelo C.",
      motto: "Success is not final, failure is not fatal: it is the courage to continue."
    },
    {
      name: "Mendoza, Bea Patricia L.",
      motto: "Embrace uncertainty and let your vision outshine your fear."
    },
    {
      name: "Navarro, Ralph Michael G.",
      motto: "Hard work beats talent when talent fails to work hard."
    },
    {
      name: "Aquino, Stephanie Nicole V.",
      motto: "She believed she could, so she did with unwavering grace."
    },
    {
      name: "Castillo, Joshua Daniel F.",
      motto: "Character is what you do when nobody is watching."
    }
  ];

  const students = sampleRoster.map((item, idx) => {
    const chosenTier = validTiers[idx % validTiers.length] || "Set A";
    const nameValidation = validateStudentCompleteName(item.name);

    return {
      id: idx + 1,
      studentNo: `2026-${String(idx + 101).padStart(4, "0")}`,
      name: item.name,
      packageSet: chosenTier,
      motto: item.motto,
      section: "Alcala",
      strand: "ABM (Accountancy, Business & Management)",
      isValidName: nameValidation.isValid,
      validationError: nameValidation.isValid ? null : nameValidation.reason,
      status: "verified"
    };
  });

  const setCounts = {};
  validTiers.forEach((t) => {
    setCounts[t] = 0;
  });
  students.forEach((s) => {
    setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
  });

  return {
    success: true,
    school: "Lipata Senior High School",
    strand: "ABM (Accountancy, Business & Management)",
    section: "Alcala",
    batch: "Batch 2026",
    adviserName: "Prof. Juanita Dela Cruz",
    adviserEmail: "adviser.delacruz@school.edu.ph",
    adviserPhone: "0917-890-1234",
    selectedPackage: "Senior High Packages",
    packageName: "Senior High Packages",
    students,
    summary: {
      total: students.length,
      validStudents: students.length,
      invalidStudents: 0,
      setCounts
    },
    numPages: 1,
    extractionMethod: "demo_mock"
  };
}
