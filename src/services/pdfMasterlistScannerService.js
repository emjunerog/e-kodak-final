/**
 * pdfMasterlistScannerService.js
 * ============================================================================
 * High-performance PDF parser and AI scanner for School Section Masterlists.
 *
 * Capabilities:
 *  1. Client-side PDF parsing using pdfjs-dist (reconstructing table rows via
 *     spatial Y-coordinate clustering).
 *  2. High-speed heuristic regex extractor detecting:
 *     - Student Names (Philippine & international formats: Last, First M. or First Last)
 *     - Student ID numbers
 *     - Package Set assignments (Set A, Set B, Set C, Set D, Package A, etc.)
 *     - School name, Section/Strand, and Batch year
 *  3. Seamless AI Fallback (Groq / Gemini via src/lib/ai.js) for unstructured,
 *     scanned OCR, or non-standard multi-column tables.
 *  4. Instant instant-mock masterlist generator for demo & preview testing.
 * ============================================================================
 */

import * as pdfjsLib from "pdfjs-dist";
import universalClient, { isAiConfigured, chatWithGroq, isGroqConfigured } from "../lib/ai.js";

// Configure PDF.js worker in browser environments
if (typeof window !== "undefined") {
  try {
    // Standard worker from CDN or local bundle
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  } catch (err) {
    console.warn("PDF.js worker initialization notice:", err);
  }
}

/**
 * Standardize text case (e.g. "SANTOS, MARIA CLARA" -> "Santos, Maria Clara")
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
  let section = "";
  let batch = "";

  // 1. Detect School Name from header lines
  const schoolRegex = /(?:university|college|school|academy|institute|high school|national high)\b/i;
  for (let i = 0; i < Math.min(15, allLines.length); i++) {
    if (schoolRegex.test(allLines[i]) && !school) {
      school = allLines[i].replace(/^[^a-zA-Z]+/, "").trim();
      break;
    }
  }

  // 2. Detect Section / Strand / Program
  const sectionRegex = /(?:section|strand|grade|class|year|batch|bsit|bsba|stem|humss|abm|gas|tvl)[\s:\-–—]+([^\n\r,]+)/i;
  for (let i = 0; i < Math.min(15, allLines.length); i++) {
    const match = allLines[i].match(sectionRegex);
    if (match && !section) {
      section = match[0].trim();
      break;
    }
  }

  // 3. Detect Graduation Year / Batch
  const batchRegex = /(?:batch\s*\d{4}|202[4-9]\s*[-–—]\s*202[5-9]|202[4-9])/i;
  for (let i = 0; i < Math.min(15, allLines.length); i++) {
    const match = allLines[i].match(batchRegex);
    if (match && !batch) {
      batch = match[0].trim();
      break;
    }
  }

  // 4. Scan student records and package orders
  const students = [];
  const studentIndexRegex = /^\s*(?:(?:#|no\.?|id)?\s*(\d+)[\.\)]?\s+)?([A-Za-z\s,\.\-–—']+?)(?:\s+((?:20\d{2}[-\s]?\d{3,6}|\d{7,10})))?\s+(?:[-–—|:]\s*)?(Set\s*[A-D]|Package\s*[A-D]|Tier\s*[A-D]|\b[A-D]\b)(.*)$/i;

  let rowCounter = 1;

  for (const line of allLines) {
    // Skip obvious table headers
    if (
      /^\s*(?:#|no\.?|student\s*name|name\s*of\s*student|package|set|signature|remarks|contact)/i.test(line) &&
      /(?:package|tier|set|signature|remarks)/i.test(line)
    ) {
      continue;
    }

    // Try matching line with index, name, and package
    const match = line.match(studentIndexRegex);
    if (match) {
      const idx = match[1] ? parseInt(match[1], 10) : rowCounter++;
      let rawName = match[2].trim();
      const studentNo = match[3] ? match[3].trim() : "";
      const rawPackage = match[4].trim();

      // Skip lines where the "name" is actually a header word
      if (
        /^(date|page|total|school|strand|teacher|adviser|instructor|signature|status)$/i.test(rawName) ||
        rawName.length < 3
      ) {
        continue;
      }

      // Clean name
      rawName = rawName.replace(/^[-–—#0-9\.\s]+/, "").trim();
      const formattedName = toTitleCase(rawName);
      const normalizedSet = normalizePackageSet(rawPackage, validTiers);

      students.push({
        id: idx,
        studentNo: studentNo || `STU-${String(idx).padStart(3, "0")}`,
        name: formattedName,
        packageSet: normalizedSet,
        section: section || "School Section",
        status: "verified"
      });
      continue;
    }

    // Fallback line search: line contains a package tier keyword
    const packageKeywordMatch = line.match(/\b(Set\s*[A-D]|Package\s*[A-D])\b/i);
    if (packageKeywordMatch) {
      const pkg = packageKeywordMatch[1];
      const namePart = line.replace(packageKeywordMatch[0], "").trim().replace(/^[-–—0-9\.\s]+/, "").trim();
      if (namePart.length >= 3 && !/^(total|summary|package|inclusions|deliverables)/i.test(namePart)) {
        students.push({
          id: rowCounter++,
          studentNo: `STU-${String(rowCounter).padStart(3, "0")}`,
          name: toTitleCase(namePart),
          packageSet: normalizePackageSet(pkg, validTiers),
          section: section || "School Section",
          status: "verified"
        });
      }
    }
  }

  // Calculate summary counts
  const setCounts = {};
  validTiers.forEach((t) => {
    setCounts[t] = 0;
  });

  students.forEach((s) => {
    setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
  });

  return {
    success: students.length > 0,
    school: school || "High School / University Partner",
    section: section || "Section Batch",
    batch: batch || "Batch 2026",
    students,
    summary: {
      total: students.length,
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
Extract:
1. School Name
2. Section / Strand / Degree program
3. Graduation Batch / School Year
4. Student Roster list, where each student has their full name and chosen package set (${validTiers.join(", ")}).

Text from PDF:
"""
${fullText.slice(0, 12000)}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "school": "Name of the School",
  "section": "Section name or Strand",
  "batch": "Batch 2026 or School Year",
  "students": [
    {
      "id": 1,
      "studentNo": "Student ID or STU-001",
      "name": "Lastname, Firstname Middlename",
      "packageSet": "Set A"
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

    const students = (parsed.students || []).map((s, idx) => ({
      id: s.id || idx + 1,
      studentNo: s.studentNo || `STU-${String(idx + 1).padStart(3, "0")}`,
      name: toTitleCase(s.name || `Student ${idx + 1}`),
      packageSet: normalizePackageSet(s.packageSet, validTiers),
      section: parsed.section || "School Section",
      status: "verified"
    }));

    const setCounts = {};
    validTiers.forEach((t) => {
      setCounts[t] = 0;
    });
    students.forEach((s) => {
      setCounts[s.packageSet] = (setCounts[s.packageSet] || 0) + 1;
    });

    return {
      success: students.length > 0,
      school: parsed.school || "School Partner",
      section: parsed.section || "School Section",
      batch: parsed.batch || "Batch 2026",
      students,
      summary: {
        total: students.length,
        setCounts
      }
    };
  } catch (err) {
    console.error("AI PDF parsing fallback error:", err);
    throw err;
  }
}

/**
 * 4. Master Orchestrator: Scan a School Masterlist PDF
 */
export async function scanSchoolMasterlistPDF(fileOrBuffer, validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  // Step 1: Extract text
  const { fullText, pages, numPages } = await extractTextFromPDF(fileOrBuffer);

  if (!fullText || fullText.trim().length === 0) {
    throw new Error("The uploaded PDF has no extractable text. Please ensure it is not a scanned image with zero text layers.");
  }

  // Step 2: Try fast heuristic regex extraction
  const heuristicResult = parseMasterlistRoster(fullText, pages, validTiers);

  // If heuristic detected at least 1 student, return immediately
  if (heuristicResult.success && heuristicResult.students.length > 0) {
    return {
      ...heuristicResult,
      numPages,
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
    extractionMethod: "heuristic_empty",
    rawText: fullText
  };
}

/**
 * 5. Mock Masterlist Generator for instant demo testing
 */
export function generateMockMasterlist(validTiers = ["Set A", "Set B", "Set C", "Set D"]) {
  const sampleNames = [
    "Santos, Maria Clara P.",
    "Dela Cruz, Juan Pedro M.",
    "Alimento, Mark June R.",
    "Sinugbuhan, Jude Lawrence T.",
    "Bautista, Kimberly Anne D.",
    "Villanueva, Christian Jay S.",
    "Torres, Angelica Mae B.",
    "Reyes, Francis Angelo C.",
    "Mendoza, Bea Patricia L.",
    "Navarro, Ralph Michael G.",
    "Aquino, Stephanie Nicole V.",
    "Castillo, Joshua Daniel F."
  ];

  const students = sampleNames.map((name, idx) => {
    const chosenTier = validTiers[idx % validTiers.length] || "Set A";
    return {
      id: idx + 1,
      studentNo: `2026-${String(idx + 101).padStart(4, "0")}`,
      name,
      packageSet: chosenTier,
      section: "Grade 12 - STEM Diamond",
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
    school: "Naga National High School - Senior High Campus",
    section: "Grade 12 - STEM Diamond",
    batch: "Batch 2026",
    students,
    summary: {
      total: students.length,
      setCounts
    },
    numPages: 1,
    extractionMethod: "demo_mock"
  };
}
