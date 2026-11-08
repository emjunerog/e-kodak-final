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
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  BorderStyle
} from "docx";

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
 * Builds the jsPDF document instance for the Official School Section Masterlist PDF.
 * Used both for direct PDF downloads and for internal document-to-PDF conversion.
 */
export function buildMasterlistPDFDoc({
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

  // Studio Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("E-KODAK STUDIO · OFFICIAL SCHOOL SECTION MASTERLIST", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Standard Graduation Portrait & Yearbook Intake Specification", 14, 17.5);
  doc.text("Academic Year & Graduation Session Roster", 14, 22.5);

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
    startY: startY + 44,
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
      valign: "top"
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

  return { doc, targetFileName };
}

/**
 * Generates and downloads the Official School Section Masterlist PDF Template.
 */
export function generateMasterlistPDFTemplate(options = {}) {
  const { doc, targetFileName } = buildMasterlistPDFDoc(options);
  doc.save(targetFileName);
  return targetFileName;
}

/**
 * Generates an in-memory PDF ArrayBuffer from masterlist data (used by converter pipeline).
 */
export function generateMasterlistPDFBuffer(options = {}) {
  const { doc, targetFileName } = buildMasterlistPDFDoc(options);
  const arrayBuffer = doc.output("arraybuffer");
  return { arrayBuffer, targetFileName };
}

/**
 * Generates a browser File (or Blob) object of type application/pdf from masterlist data.
 */
export function generateMasterlistPDFFile(options = {}) {
  const { arrayBuffer, targetFileName } = generateMasterlistPDFBuffer(options);
  const pdfName = targetFileName.endsWith(".pdf")
    ? targetFileName
    : `${targetFileName.replace(/\.[^.]+$/, "")}.pdf`;

  if (typeof File !== "undefined") {
    return new File([arrayBuffer], pdfName, { type: "application/pdf" });
  }
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  blob.name = pdfName;
  return blob;
}

/**
 * Builds an in-memory 100% Editable Microsoft Word (.docx) Masterlist Blob.
 * Solves the issue where opening a PDF in MS Word flattens into an uneditable image.
 * When opened in MS Word, teachers can type directly into table cells.
 */
export async function generateMasterlistDocxBlob({
  school = "Name of School",
  strand = "Academic Strand",
  section = "Class Section",
  batch = "Batch 2026",
  adviserName = "",
  adviserEmail = "",
  adviserPhone = "",
  packageName = "Senior High Packages",
  students = null,
  fileName = null
} = {}) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  const metaLabelCell = (text) =>
    new TableCell({
      width: { size: 22, type: WidthType.PERCENTAGE },
      shading: { fill: "F8FAFC", type: ShadingType.CLEAR },
      borders,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, size: 18, color: "475569", font: "Arial" })]
        })
      ]
    });

  const metaValCell = (text, isGold = false) =>
    new TableCell({
      width: { size: 28, type: WidthType.PERCENTAGE },
      borders,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: text || " ",
              bold: true,
              size: 18,
              color: isGold ? "D97706" : "0F172A",
              font: "Arial"
            })
          ]
        })
      ]
    });

  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          metaLabelCell("NAME OF SCHOOL:"),
          metaValCell(school || "Name of School"),
          metaLabelCell("BATCH #:"),
          metaValCell(batch || "Batch 2026")
        ]
      }),
      new TableRow({
        children: [
          metaLabelCell("ACADEMIC STRAND:"),
          metaValCell(strand || "Academic Strand"),
          metaLabelCell("CLASS SECTION:"),
          metaValCell(section || "Class Section")
        ]
      }),
      new TableRow({
        children: [
          metaLabelCell("CLASS ADVISER:"),
          metaValCell(adviserName || "Class Adviser Name"),
          metaLabelCell("ADVISER PHONE:"),
          metaValCell(adviserPhone || "09XX-XXX-XXXX")
        ]
      }),
      new TableRow({
        children: [
          metaLabelCell("ADVISER EMAIL:"),
          metaValCell(adviserEmail || "adviser@school.edu.ph"),
          metaLabelCell("PACKAGE:"),
          metaValCell(packageName || "Senior High Packages", true)
        ]
      })
    ]
  });

  // Table Header Cell for Student Roster
  const rosterHeaderCell = (text, widthPercent) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: "0F172A", type: ShadingType.CLEAR },
      borders,
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 17, font: "Arial" })]
        })
      ]
    });

  // Body Cell for Student Roster
  const rosterBodyCell = (text, widthPercent, align = AlignmentType.LEFT, isAlt = false) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: isAlt ? { fill: "F8FAFC", type: ShadingType.CLEAR } : undefined,
      borders,
      margins: { top: 90, bottom: 90, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: text || " ", size: 18, color: "1E293B", font: "Arial" })]
        })
      ]
    });

  const rosterRows = [
    new TableRow({
      tableHeader: true,
      children: [
        rosterHeaderCell("#", 6),
        rosterHeaderCell("STUDENT ID", 18),
        rosterHeaderCell("STUDENT COMPLETE NAME\n(Last Name, First Name Middle Name)", 34),
        rosterHeaderCell("SET CATEGORY\n(Set A, B, C, D)", 16),
        rosterHeaderCell("YEARBOOK MOTTO", 26)
      ]
    })
  ];

  const rowCount = students && students.length > 0 ? students.length : 35;
  for (let i = 1; i <= rowCount; i++) {
    const s = students && students[i - 1] ? students[i - 1] : null;
    const isAlt = i % 2 === 0;
    rosterRows.push(
      new TableRow({
        children: [
          rosterBodyCell(String(i), 6, AlignmentType.CENTER, isAlt),
          rosterBodyCell(s ? (s.studentNo || s.student_id || "") : "", 18, AlignmentType.LEFT, isAlt),
          rosterBodyCell(s ? (s.name || s.student_name || "") : "", 34, AlignmentType.LEFT, isAlt),
          rosterBodyCell(s ? (s.packageSet || s.package || "Set A") : "", 16, AlignmentType.CENTER, isAlt),
          rosterBodyCell(s ? (s.motto || s.yearbook_motto || "") : "", 26, AlignmentType.LEFT, isAlt)
        ]
      })
    );
  }

  const rosterTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rosterRows
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000
            }
          }
        },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "E-KODAK STUDIO · OFFICIAL SCHOOL SECTION MASTERLIST",
                bold: true,
                size: 26,
                color: "0F172A",
                font: "Arial"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: "Standard Graduation Portrait & Yearbook Intake Specification",
                size: 18,
                color: "64748B",
                font: "Arial"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Academic Year & Graduation Session Roster",
                size: 18,
                color: "64748B",
                font: "Arial"
              })
            ]
          }),
          metadataTable,
          new Paragraph({ spacing: { after: 240 } }),
          rosterTable,
          new Paragraph({
            spacing: { before: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "E-Kodak Studio Graduation Masterlist Verification System · Confidential School Roster",
                size: 16,
                color: "94A3B8",
                font: "Arial"
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const sanitizedSchool = (school || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedSection = (section || "Section").replace(/[^a-zA-Z0-9]/g, "_");
  const targetFileName = fileName || `E-Kodak_Masterlist_Template_${sanitizedSchool}_${sanitizedSection}.docx`;

  return { blob, targetFileName };
}

/**
 * Generates and downloads an Official, 100% Editable Microsoft Word (.docx) Masterlist Template.
 */
export async function generateMasterlistDocxTemplate(options = {}) {
  const { blob, targetFileName } = await generateMasterlistDocxBlob(options);

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = targetFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return targetFileName;
}

