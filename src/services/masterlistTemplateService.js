/**
 * masterlistTemplateService.js
 * ============================================================================
 * Official PDF Masterlist Generator & Validator for E-Kodak Studio.
 *
 * Implements client-side PDF generation using jsPDF & jspdf-autotable.
 * Generates official, printable, and searchable PDF masterlists matching
 * exact studio intake requirements:
 *   1. Name of School
 *   2. Strand
 *   3. Section
 *   4. Class Adviser's Name and Email
 *   5. Batch #
 *   6. Phone Number of the Class Adviser
 *   7. Student ID Number
 *   8. Student Complete Name (Strictly requires First, Middle, and Last name)
 *   9. Each Student's Package & Set (Set A, Set B, Set C, Set D)
 *  10. Each Student's Yearbook Motto
 * ============================================================================
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Validates whether a student name is complete.
 * Requirement: Invalid if there is no middle name (or initial) or last name.
 * 
 * Valid examples:
 *  - "Santos, Maria Clara P."
 *  - "Dela Cruz, Juan Pedro M."
 *  - "Maria Clara P. Santos"
 *  - "Jude Lawrence Laroa Sinugbuhan"
 * 
 * Invalid examples:
 *  - "John" (Single name - invalid)
 *  - "John Doe" (Only 2 words, no middle name or initial - invalid)
 *  - "Santos, Juan" (Comma separated but only 2 parts - invalid)
 */
export function validateStudentCompleteName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return {
      isValid: false,
      reason: "Missing student name"
    };
  }

  const cleaned = fullName.trim().replace(/\s+/g, " ");

  // Case A: Formatted as "Lastname, Firstname Middlename" or "Lastname, Firstname M."
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      return {
        isValid: false,
        reason: "Invalid name format (Missing first or middle name)"
      };
    }
    const lastName = parts[0];
    const givenAndMiddle = parts[1].split(" ").filter(Boolean);

    if (!lastName || lastName.length < 2) {
      return {
        isValid: false,
        reason: "Invalid or missing last name"
      };
    }

    if (givenAndMiddle.length < 2) {
      return {
        isValid: false,
        reason: "Missing middle name or middle initial (Required)"
      };
    }

    return {
      isValid: true,
      reason: "Valid complete name",
      formatted: `${lastName}, ${givenAndMiddle.join(" ")}`
    };
  }

  // Case B: Space-separated "Firstname Middlename Lastname" or "Firstname M. Lastname"
  const tokens = cleaned.split(" ").filter(Boolean);

  if (tokens.length < 3) {
    return {
      isValid: false,
      reason: tokens.length === 1 
        ? "Missing middle and last name" 
        : "Missing middle name or initial (Must have First, Middle, and Last name)"
    };
  }

  return {
    isValid: true,
    reason: "Valid complete name",
    formatted: cleaned
  };
}

/**
 * Generates and downloads the Official School Section Masterlist PDF Template.
 * Can generate either a blank template for schools to fill, or a pre-populated template.
 */
export function generateMasterlistPDFTemplate({
  school = "Lipata Senior High School",
  strand = "ABM (Accountancy, Business & Management)",
  section = "Alcala",
  batch = "Batch 2026",
  adviserName = "Prof. Juanita Dela Cruz",
  adviserEmail = "adviser.delacruz@school.edu.ph",
  adviserPhone = "0917-890-1234",
  packageName = "Senior High Packages",
  students = null,
  isSample = false,
  fileName = null
} = {}) {
  // A4 dimensions: 210 x 297 mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm

  // ── Header / Studio Branding Bar ──────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900 / dark charcoal
  doc.rect(0, 0, pageWidth, 28, "F");

  // Gold accent line
  doc.setFillColor(217, 119, 6); // amber-600 / gold
  doc.rect(0, 27, pageWidth, 1.5, "F");

  // Studio Title (Sized comfortably to never collide with the badge)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("E-KODAK STUDIO · OFFICIAL SCHOOL SECTION MASTERLIST", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Standard Graduation Portrait & Yearbook Intake Specification", 14, 17.5);
  doc.text("Academic Year & Graduation Session Roster", 14, 22.5);

  // Template Type Badge (Right side of header with centered text)
  const badgeW = 38;
  const badgeH = 10;
  const badgeX = pageWidth - 14 - badgeW; // 158mm
  const badgeY = 9;
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  const badgeText = isSample ? "SAMPLE TEMPLATE" : "OFFICIAL TEMPLATE";
  const badgeTw = doc.getTextWidth(badgeText);
  doc.text(badgeText, badgeX + (badgeW - badgeTw) / 2, badgeY + 6.5);

  // ── Metadata Grid (School, Strand, Section, Adviser, Batch) ───────────────
  const startY = 35;
  const cardW = pageWidth - 28; // 182mm

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, startY, cardW, 38, 2, 2, "FD");

  // Two-column grid alignment coordinates (strictly aligned vertical axes)
  const leftLabelX = 18;
  const leftValX = 58;
  const rightLabelX = 122;
  const rightValX = 154;

  const r1Y = startY + 7;
  const r2Y = startY + 15;
  const r3Y = startY + 26;
  const r4Y = startY + 34;

  // Row 1: School & Batch
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("NAME OF SCHOOL:", leftLabelX, r1Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(school || "Name of School", leftValX, r1Y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("BATCH #:", rightLabelX, r1Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(batch || "Batch 2026", rightValX, r1Y);

  // Row 2: Strand & Section
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ACADEMIC STRAND:", leftLabelX, r2Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(strand || "Academic Strand", leftValX, r2Y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("CLASS SECTION:", rightLabelX, r2Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(section || "Class Section", rightValX, r2Y);

  // Divider line inside metadata card
  doc.setDrawColor(226, 232, 240);
  doc.line(18, startY + 20, pageWidth - 18, startY + 20);

  // Row 3: Class Adviser Info (Name, Email, Phone)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("CLASS ADVISER NAME:", leftLabelX, r3Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(adviserName || "Class Adviser Name", leftValX, r3Y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ADVISER PHONE:", rightLabelX, r3Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(adviserPhone || "09XX-XXX-XXXX", rightValX, r3Y);

  // Row 4: Adviser Email & Selected Package
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ADVISER EMAIL:", leftLabelX, r4Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(adviserEmail || "adviser@school.edu.ph", leftValX, r4Y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("PACKAGE:", rightLabelX, r4Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(packageName || "Senior High Packages", rightValX, r4Y);

  // ── Mandatory Validation Notice Callout Box ───────────────────────────────
  const noticeY = startY + 41;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(14, noticeY, pageWidth - 28, 14, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-900
  doc.text("CRITICAL INTAKE & VALIDATION RULES:", 18, noticeY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber-800
  doc.text(
    "1. Complete Name must have Last Name, First Name, and Middle Name/Initial (e.g. Santos, Maria Clara P.). Entries without middle or last name are INVALID.",
    18,
    noticeY + 9
  );
  doc.text(
    `2. Section Package: ${packageName || "Senior High Packages"}. Each student must have a Student ID Number, an assigned Set Category (Set A, Set B, Set C, or Set D), and an official Yearbook Motto.`,
    18,
    noticeY + 12.5
  );

  // ── Student Roster Table Data ─────────────────────────────────────────────
  let tableRows = [];

  if (students && students.length > 0) {
    tableRows = students.map((s, idx) => [
      String(idx + 1),
      s.studentNo || s.student_id || `2026-${String(idx + 1).padStart(4, "0")}`,
      s.name || s.student_name || "",
      s.packageSet || s.package || "Set A",
      s.motto || s.yearbook_motto || ""
    ]);
  } else if (isSample) {
    // 12 Standard Sample Students with complete names and mottos
    tableRows = [
      [
        "1",
        "2026-00101",
        "Santos, Maria Clara P.",
        "Set A",
        "Perseverance and dedication will illuminate every path forward."
      ],
      [
        "2",
        "2026-00102",
        "Dela Cruz, Juan Pedro M.",
        "Set B",
        "Honor, excellence, and integrity in every endeavor."
      ],
      [
        "3",
        "2026-00103",
        "Sinugbuhan, Jude Lawrence L.",
        "Set A",
        "Akos's sayo ikaw ay akin."
      ],
      [
        "4",
        "2026-00104",
        "Alimento, Mark June R.",
        "Set A",
        "Perseverance and dedication will illuminate every path forward."
      ],
      [
        "5",
        "2026-00105",
        "Bautista, Kimberly Anne D.",
        "Set C",
        "Dream with ambition, lead with passion, and inspire with grace."
      ],
      [
        "6",
        "2026-00106",
        "Villanueva, Christian Jay S.",
        "Set B",
        "Every small step taken in discipline leads to a giant leap in life."
      ],
      [
        "7",
        "2026-00107",
        "Torres, Angelica Mae B.",
        "Set D",
        "Gratitude turns what we have into more than enough."
      ],
      [
        "8",
        "2026-00108",
        "Reyes, Francis Angelo C.",
        "Set A",
        "Success is not final, failure is not fatal: it is the courage to continue."
      ],
      [
        "9",
        "2026-00109",
        "Mendoza, Bea Patricia L.",
        "Set B",
        "Embrace uncertainty and let your vision outshine your fear."
      ],
      [
        "10",
        "2026-00110",
        "Navarro, Ralph Michael G.",
        "Set A",
        "Hard work beats talent when talent fails to work hard."
      ],
      [
        "11",
        "2026-00111",
        "Aquino, Stephanie Nicole V.",
        "Set C",
        "She believed she could, so she did with unwavering grace."
      ],
      [
        "12",
        "2026-00112",
        "Castillo, Joshua Daniel F.",
        "Set B",
        "Character is what you do when nobody is watching."
      ]
    ];
  } else {
    // Blank template rows (ready to fill or print)
    for (let i = 1; i <= 25; i++) {
      tableRows.push([
        String(i),
        "",
        "",
        "",
        ""
      ]);
    }
  }

  // ── Render Table with jspdf-autotable ──────────────────────────────────────
  autoTable(doc, {
    startY: noticeY + 17,
    head: [
      [
        "#",
        "STUDENT ID",
        "STUDENT COMPLETE NAME\n(Last Name, First Name Middle Name)",
        "SET CATEGORY\n(Set A, B, C, D)",
        "YEARBOOK MOTTO"
      ]
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59], // slate-800
      cellPadding: 2.5,
      valign: "middle"
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" }, // #
      1: { cellWidth: 26, fontStyle: "bold", font: "courier" }, // ID
      2: { cellWidth: 55, fontStyle: "bold" }, // Name
      3: { cellWidth: 26, halign: "center", fontStyle: "bold" }, // Package Set
      4: { cellWidth: 65 } // Motto
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Footer with Studio Guarantee and Page numbers
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400

      // Studio footer text
      doc.text(
        "E-Kodak Studio Graduation Masterlist Verification System · Confidential School Roster",
        14,
        pageHeight - 8
      );

      // Page numbers
      const pageStr = `Page ${data.pageNumber} of ${totalPages}`;
      doc.text(pageStr, pageWidth - 14 - doc.getTextWidth(pageStr), pageHeight - 8);
    }
  });

  // Target download filename
  const sanitizedSchool = (school || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedSection = (section || "Section").replace(/[^a-zA-Z0-9]/g, "_");
  const targetFileName =
    fileName ||
    (isSample
      ? `E-Kodak_SAMPLE_Masterlist_${sanitizedSchool}_${sanitizedSection}.pdf`
      : `E-Kodak_Masterlist_Template_${sanitizedSchool}_${sanitizedSection}.pdf`);

  doc.save(targetFileName);
  return targetFileName;
}

