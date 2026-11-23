/**
 * brochurePdfExporter.js
 * ======================
 * Exports the active package brochure into a multi-page PDF matching the
 * exact modal format, wood-and-crystal framing, typography, and 1:1 physical
 * inch proportions without slicing any print card across page boundaries.
 */

const PDF_PAGE_WIDTH_IN = 14;
const PDF_PAGE_HEIGHT_IN = 21;
const PDF_MARGIN_X_IN = 0.3;
const PDF_MARGIN_Y_IN = 0.35;
const PDF_CONTENT_WIDTH_IN = PDF_PAGE_WIDTH_IN - PDF_MARGIN_X_IN * 2;
const PDF_BLOCK_GAP_IN = 0.22;

function slugify(value) {
  return String(value || "brochure")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function waitForImage(img) {
  if (img.complete && img.naturalWidth > 0) {
    return typeof img.decode === "function"
      ? img.decode().catch(() => {})
      : Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}

/**
 * html2canvas 1.4.1 does not reliably honor CSS `object-fit: cover` and
 * `object-position`. Pre-cropping each `<img>` onto a 2x canvas preserves the
 * exact `object-top` / `object-center` framing in the exported PDF.
 */
function bakeCoverImages(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  for (const img of imgs) {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const targetW = img.clientWidth;
    const targetH = img.clientHeight;
    if (!natW || !natH || !targetW || !targetH) continue;

    const alignTop = img.dataset.align === "top";
    const scale = Math.max(targetW / natW, targetH / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    const offsetX = (targetW - drawW) / 2;
    const offsetY = alignTop ? 0 : (targetH - drawH) / 2;

    const dpr = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(targetW * dpr));
    canvas.height = Math.max(1, Math.round(targetH * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.scale(dpr, dpr);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    try {
      img.src = canvas.toDataURL("image/jpeg", 0.92);
      img.style.objectFit = "fill";
    } catch {
      // Fallback to original image if canvas tainting occurs
    }
  }
}

function buildPrintCardNode(item) {
  const section = document.createElement("section");
  section.setAttribute("data-pdf-block", "section");
  section.className =
    "rounded-3xl bg-white border border-neutral-200 p-5 shadow-warm-sm space-y-4";

  // Obsidian & gold header bar
  const headerBar = document.createElement("div");
  headerBar.className =
    "flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 px-5 py-3.5 border border-gold/25 shadow-sm";

  const left = document.createElement("div");
  left.className = "flex items-center gap-3 min-w-0";

  const accent = document.createElement("span");
  accent.className =
    "w-1 h-7 rounded-full bg-gradient-to-b from-gold-light via-gold to-gold-dark shrink-0";

  const title = document.createElement("h3");
  title.className =
    "font-heading text-xl font-bold text-white tracking-tight leading-snug";
  title.textContent = item.displayTitle;

  left.append(accent, title);

  const countPill = document.createElement("span");
  countPill.className =
    "shrink-0 px-3.5 py-1 rounded-full bg-gold text-primary font-body text-xs font-bold tracking-wide shadow-sm tabular-nums";
  countPill.textContent = `${item.quantity} ${item.quantity === 1 ? "Piece" : "Pieces"}`;

  headerBar.append(left, countPill);
  section.appendChild(headerBar);

  // Prints row
  const row = document.createElement("div");
  row.className =
    item.quantity === 1
      ? "flex items-start"
      : "flex flex-wrap items-start justify-center gap-4";

  const widthCss = `${item.widthIn.toFixed(4)}in`;
  const heightCss = `${item.heightIn.toFixed(4)}in`;

  for (let i = 0; i < item.quantity; i++) {
    const figure = document.createElement("figure");
    figure.className = `shrink-0 flex flex-col items-center gap-1.5 ${
      item.quantity === 1 ? "mx-auto" : ""
    }`;

    const frameBox = document.createElement("div");
    frameBox.className = `relative overflow-hidden ${
      item.hasFrame
        ? "wood-crystal-frame"
        : "border border-neutral-300 bg-white shadow-sm"
    }`;
    frameBox.style.width = widthCss;
    frameBox.style.height = heightCss;

    const img = document.createElement("img");
    img.src = item.imageSources?.[i] || item.imageSrc;
    img.alt = `${item.displayTitle} — copy ${i + 1}`;
    img.loading = "eager";
    img.dataset.align = item.subject === "family" ? "center" : "top";
    img.className = `w-full h-full block ${
      item.subject === "family"
        ? "object-cover object-center"
        : "object-cover object-top"
    }`;

    if (item.hasFrame) {
      const mat = document.createElement("div");
      mat.className = "relative wood-crystal-mat";

      const well = document.createElement("div");
      well.className =
        "relative w-full h-full overflow-hidden border border-neutral-900/20 shadow-inner";
      well.appendChild(img);

      const glass = document.createElement("span");
      glass.className = "wood-crystal-glass";

      mat.append(well, glass);
      frameBox.appendChild(mat);
    } else {
      frameBox.appendChild(img);
    }

    const caption = document.createElement("figcaption");
    caption.className = "font-body text-xs text-neutral-500 tabular-nums";
    caption.textContent = `${item.sizeLabel.split(" ")[0]} · #${i + 1}`;

    figure.append(frameBox, caption);
    row.appendChild(figure);
  }

  section.appendChild(row);
  return section;
}

function buildBrochureExportDom(service, tier, brochure) {
  const root = document.createElement("div");
  root.style.position = "absolute";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PDF_CONTENT_WIDTH_IN}in`;
  root.style.backgroundColor = "#f5f4f0";
  root.className = "space-y-4 font-body text-primary";

  // Top dark header matching modal header
  const header = document.createElement("div");
  header.setAttribute("data-pdf-block", "header");
  header.className =
    "rounded-3xl bg-neutral-950 text-white px-6 py-4 border border-white/10";

  const eyebrow = document.createElement("p");
  eyebrow.className =
    "font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold";
  eyebrow.textContent = "Here's what you can get in this package";

  const titleRow = document.createElement("div");
  titleRow.className = "flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-0.5";

  const h2 = document.createElement("h2");
  h2.className = "font-heading text-2xl font-semibold text-white tracking-tight";
  h2.textContent = `${service.name} — ${tier.name}`;

  const price = document.createElement("span");
  price.className = "font-heading text-lg font-bold text-gold";
  price.textContent = tier.price || "";

  titleRow.append(h2, price);
  header.append(eyebrow, titleRow);
  root.appendChild(header);

  for (const item of brochure.prints) {
    root.appendChild(buildPrintCardNode(item));
  }

  // Summary footer matching modal footer
  const footer = document.createElement("div");
  footer.setAttribute("data-pdf-block", "footer");
  footer.className =
    "rounded-2xl bg-white border border-neutral-200 px-6 py-4 flex items-center justify-between text-sm text-neutral-600";

  const summarySpan = document.createElement("span");
  const printsStrong = document.createElement("strong");
  printsStrong.className = "text-primary";
  printsStrong.textContent = `${brochure.totalPrints} physical prints`;

  const tierStrong = document.createElement("strong");
  tierStrong.className = "text-primary";
  tierStrong.textContent = tier.name || "";

  summarySpan.append(
    "Showing ",
    printsStrong,
    " in ",
    tierStrong,
    tier.price ? ` (${tier.price})` : ""
  );

  const brandSpan = document.createElement("span");
  brandSpan.className =
    "text-xs font-semibold uppercase tracking-wider text-gold-dark";
  brandSpan.textContent = "E-Kodak Studio · 1:1 Actual Size Brochure";

  footer.append(summarySpan, brandSpan);
  root.appendChild(footer);

  return root;
}

function paintPageBackground(pdf) {
  pdf.setFillColor(245, 244, 240);
  pdf.rect(0, 0, PDF_PAGE_WIDTH_IN, PDF_PAGE_HEIGHT_IN, "F");
}

/**
 * Generates and downloads a multi-page 1:1 true-size PDF of the selected set brochure.
 */
export async function exportBrochureToPdf({ service, tier, brochure }) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const exportRoot = buildBrochureExportDom(service, tier, brochure);
  document.body.appendChild(exportRoot);

  try {
    const imgs = Array.from(exportRoot.querySelectorAll("img"));
    await Promise.all(imgs.map(waitForImage));
    bakeCoverImages(exportRoot);

    const blocks = Array.from(exportRoot.querySelectorAll("[data-pdf-block]"));
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: [PDF_PAGE_WIDTH_IN, PDF_PAGE_HEIGHT_IN],
      compress: true,
    });

    paintPageBackground(pdf);

    let cursorY = PDF_MARGIN_Y_IN;
    const maxUsableHeight = PDF_PAGE_HEIGHT_IN - PDF_MARGIN_Y_IN * 2;

    for (const block of blocks) {
      const canvas = await html2canvas(block, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });

      let drawW = PDF_CONTENT_WIDTH_IN;
      let drawH = (canvas.height / canvas.width) * drawW;

      if (drawH > maxUsableHeight) {
        const fitRatio = maxUsableHeight / drawH;
        drawW *= fitRatio;
        drawH = maxUsableHeight;
      }

      if (cursorY > PDF_MARGIN_Y_IN && cursorY + drawH > PDF_PAGE_HEIGHT_IN - PDF_MARGIN_Y_IN) {
        pdf.addPage([PDF_PAGE_WIDTH_IN, PDF_PAGE_HEIGHT_IN], "portrait");
        paintPageBackground(pdf);
        cursorY = PDF_MARGIN_Y_IN;
      }

      const drawX = PDF_MARGIN_X_IN + (PDF_CONTENT_WIDTH_IN - drawW) / 2;
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", drawX, cursorY, drawW, drawH, undefined, "FAST");
      cursorY += drawH + PDF_BLOCK_GAP_IN;
    }

    const fileName = `${slugify(service?.name)}-${slugify(tier?.name)}-brochure.pdf`;
    pdf.save(fileName);
  } finally {
    exportRoot.remove();
  }
}
