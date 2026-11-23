/**
 * printBrochureParser.js
 * ======================
 * Parses package tier inclusion strings into physical print specifications
 * (quantity, exact dimensions in inches, subject category, and real studio
 * photography from GraduationImages — no AI images).
 *
 * Within a single set, prints for a given item depict one consistent subject
 * (all copies match), while Set A / Set B / Set C / Set D are assigned
 * distinct portraits from a package-level shuffled permutation so photos shown
 * in Set A do not repeat in Set B.
 */

const GRAD_ASSETS = {
  filipiniana: "/images/brochure/grad/filipiniana-portrait.jpg",
  barong: "/images/brochure/grad/barong-portrait.jpg",
  family: "/images/brochure/grad/family-graduation.jpg",
  togaCapFormal: "/images/brochure/grad/toga-cap-formal.jpg",
  togaCapPose: "/images/brochure/grad/toga-cap-pose.jpg",
  togaHood: "/images/brochure/grad/toga-hood-portrait.jpg",
  togaFormal: "/images/brochure/grad/toga-formal.jpg",
};

const SET_PORTRAIT_POOL = [
  GRAD_ASSETS.togaHood,
  GRAD_ASSETS.togaFormal,
  GRAD_ASSETS.togaCapFormal,
  GRAD_ASSETS.togaCapPose,
];

const CAP_PORTRAITS = [
  GRAD_ASSETS.togaCapFormal,
  GRAD_ASSETS.togaCapPose,
];

/** Seeded PRNG (mulberry32) so package-level shuffles are pure during render. */
function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Resolves the photo(s) for a print item based on subject and the set's
 * assigned non-overlapping portrait slots.
 */
function resolveSubjectPhotos(text, quantity, tierIndex, setAssign) {
  const lower = text.toLowerCase();

  if (/\bfamily\b|\bgroup\b/.test(lower)) {
    return {
      subject: "family",
      imageSources: Array.from({ length: quantity }, () => GRAD_ASSETS.family),
    };
  }

  const hasFilipiniana = /\bfilipiniana\b|\bpilipiniana\b/.test(lower);
  const hasBarong = /\bbarong\b/.test(lower);

  if (hasFilipiniana && hasBarong) {
    // Alternate primary attire by set (e.g. Set A = Filipiniana, Set B = Barong).
    // For multi-piece rows (e.g. 6 wallet prints), show half girl in Filipiniana
    // and half boy in Barong so both attires are clearly represented.
    const pair =
      tierIndex % 2 === 0
        ? [GRAD_ASSETS.filipiniana, GRAD_ASSETS.barong]
        : [GRAD_ASSETS.barong, GRAD_ASSETS.filipiniana];

    if (quantity === 1) {
      return {
        subject: tierIndex % 2 === 0 ? "filipiniana" : "barong",
        imageSources: [pair[0]],
      };
    }

    const firstHalfCount = Math.ceil(quantity / 2);
    const imageSources = Array.from({ length: quantity }, (_, i) =>
      i < firstHalfCount ? pair[0] : pair[1]
    );
    return {
      subject: "filipiniana-barong",
      imageSources,
    };
  }

  if (hasFilipiniana) {
    return {
      subject: "filipiniana",
      imageSources: Array.from({ length: quantity }, () => GRAD_ASSETS.filipiniana),
    };
  }
  if (hasBarong) {
    return {
      subject: "barong",
      imageSources: Array.from({ length: quantity }, () => GRAD_ASSETS.barong),
    };
  }

  if (/\bacademic\s+cap\b|\bcap\b/.test(lower)) {
    return {
      subject: "portrait",
      imageSources: Array.from({ length: quantity }, () => setAssign.capPortrait),
    };
  }

  return {
    subject: "portrait",
    imageSources: Array.from({ length: quantity }, () => setAssign.mainPortrait),
  };
}

/**
 * Standard print size lookups when dimensions are named rather than WxH.
 * - Wallet (2R): 2.5" x 3.5"
 * - Philippine DFA / TESDA Passport: 35mm x 45mm (~1.38" x 1.77")
 */
const NAMED_SIZES = [
  {
    pattern: /wallet[- ]?size|\(2r\)|\b2r\b/i,
    widthIn: 2.5,
    heightIn: 3.5,
    sizeLabel: '2.5" × 3.5" (2R Wallet)',
  },
  {
    pattern: /passport[- ]?size/i,
    widthIn: 1.38,
    heightIn: 1.77,
    sizeLabel: '1.38" × 1.77" (35×45 mm Passport)',
  },
  {
    pattern: /\b3r\b/i,
    widthIn: 3.5,
    heightIn: 5,
    sizeLabel: '3.5" × 5" (3R)',
  },
  {
    pattern: /\b4r\b/i,
    widthIn: 4,
    heightIn: 6,
    sizeLabel: '4" × 6" (4R)',
  },
  {
    pattern: /\b5r\b/i,
    widthIn: 5,
    heightIn: 7,
    sizeLabel: '5" × 7" (5R)',
  },
  {
    pattern: /\b8r\b/i,
    widthIn: 8,
    heightIn: 10,
    sizeLabel: '8" × 10" (8R)',
  },
];

const MINOR_WORDS = new Set(["with", "or", "in", "on", "and", "of", "for", "the", "a", "an"]);
const UPPERCASE_WORDS = new Set(["id", "ids", "2r", "3r", "4r", "5r", "8r", "tesda"]);

/**
 * Formats stripped inclusion text into clean Title Case while preserving
 * dimension tokens (e.g. 12×18"), minor prepositions, and acronyms.
 */
function toBrochureTitleCase(text) {
  return text
    .split(/\s+/)
    .map((token, idx) =>
      token
        .split("-")
        .map((part, partIdx) => {
          const match = part.match(/^([("']*)([A-Za-z0-9×]+)([)"']*)$/);
          if (!match) return part;
          const [, prefix, core, suffix] = match;
          const lower = core.toLowerCase();

          if (UPPERCASE_WORDS.has(lower)) {
            return `${prefix}${core.toUpperCase()}${suffix}`;
          }
          if (idx > 0 && partIdx === 0 && !prefix && MINOR_WORDS.has(lower)) {
            return `${prefix}${lower}${suffix}`;
          }
          if (/^\d/.test(core)) {
            return `${prefix}${core}${suffix}`;
          }
          return `${prefix}${core.charAt(0).toUpperCase()}${core.slice(1)}${suffix}`;
        })
        .join("-")
    )
    .join(" ");
}

/**
 * Parses a single highlight string from `tier.highlights`.
 * Returns either a print item (`kind: "print"`) or a service perk (`kind: "perk"`).
 */
export function parseHighlightItem(
  rawText,
  tierIndex = 0,
  setAssign = {
    mainPortrait: SET_PORTRAIT_POOL[0],
    capPortrait: CAP_PORTRAITS[0],
  }
) {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const isUnframed = /\bunframed\b|\bwithout\s+frame\b/i.test(text);
  const hasFrame =
    !isUnframed &&
    /\b(?:with\s+crystal(?:\s+wood)?\s+frame|with\s+crystal\s+frame|on\s+crystal\s+wood\s+mount|with\s+frame|framed|crystal\s+wood\s+frame|crystal\s+frame|wood\s+mount)\b/i.test(
      text
    );

  // Match explicit WxH dimensions such as 12×18", 8x10", 2×2", 1×1"
  const dimMatch = text.match(
    /(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*(?:"|in(?:ch(?:es)?)?)?/i
  );

  let widthIn = null;
  let heightIn = null;
  let sizeLabel = "";

  if (dimMatch) {
    widthIn = parseFloat(dimMatch[1]);
    heightIn = parseFloat(dimMatch[2]);
    sizeLabel = `${widthIn}" × ${heightIn}"`;
  } else {
    const named = NAMED_SIZES.find((entry) => entry.pattern.test(text));
    if (named) {
      widthIn = named.widthIn;
      heightIn = named.heightIn;
      sizeLabel = named.sizeLabel;
    }
  }

  if (!widthIn || !heightIn) {
    return {
      kind: "perk",
      raw: text,
    };
  }

  // Extract leading quantity (e.g., "12 pieces", "1 piece", "6 pcs")
  const qtyMatch = text.match(/^(\d+)\s*(?:pieces?|pcs?|sheets?|copies)?\b/i);
  const quantity = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1;

  // Strip leading count + unit (e.g., "1 piece ", "12 pieces ") and format to Title Case
  const stripped = text.replace(/^\d+\s*(?:pieces?|pcs?|sheets?|copies)\s+/i, "").trim();
  const displayTitle = toBrochureTitleCase(stripped || text);

  const { subject, imageSources } = resolveSubjectPhotos(
    text,
    quantity,
    tierIndex,
    setAssign
  );

  return {
    kind: "print",
    raw: text,
    displayTitle,
    quantity,
    widthIn,
    heightIn,
    sizeLabel,
    hasFrame,
    subject,
    imageSrc: imageSources[0],
    imageSources,
  };
}

/**
 * Parses all highlights of a tier into print items, perks, and aggregate counts.
 * Uses a package-level permutation of portraits so Set A / Set B / Set C / Set D
 * never reuse the same portrait across sets.
 */
export function parseTierBrochure(
  tier,
  serviceSlug = "",
  randomSeed = 1,
  tierIndex = 0
) {
  const highlights = Array.isArray(tier?.highlights) ? tier.highlights : [];
  const prints = [];
  const perks = [];

  const slugSalt = Array.from(String(serviceSlug)).reduce(
    (acc, ch) => acc + ch.charCodeAt(0) * 31,
    0
  );
  const rng = createRng(Number(randomSeed || 1) + slugSalt);

  const shuffledPortraits = shuffleWithRng(SET_PORTRAIT_POOL, rng);
  const shuffledCaps = shuffleWithRng(CAP_PORTRAITS, rng);

  const safeIndex = Math.max(0, tierIndex);
  const mainPortrait = shuffledPortraits[safeIndex % shuffledPortraits.length];
  const capPortrait = CAP_PORTRAITS.includes(mainPortrait)
    ? mainPortrait
    : shuffledCaps[safeIndex % shuffledCaps.length];
  const setAssign = {
    mainPortrait,
    capPortrait,
  };

  for (const item of highlights) {
    const parsed = parseHighlightItem(item, safeIndex, setAssign);
    if (!parsed) continue;
    if (parsed.kind === "print") {
      prints.push(parsed);
    } else {
      perks.push(parsed);
    }
  }

  const totalPrints = prints.reduce((sum, item) => sum + item.quantity, 0);
  const framedCount = prints
    .filter((item) => item.hasFrame)
    .reduce((sum, item) => sum + item.quantity, 0);
  const unframedCount = totalPrints - framedCount;

  return {
    prints,
    perks,
    totalPrints,
    framedCount,
    unframedCount,
  };
}
