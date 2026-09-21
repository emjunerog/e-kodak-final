/**
 * contentService.js
 * =================
 * UNIFIED DATA ACCESS LAYER — "Supabase First, Local Fallback"
 *
 * Strategy:
 *  1. Try to load data from Supabase (if configured & connected)
 *  2. On any error or if not configured → return local static data
 *  3. Components never need to know which source was used
 *
 * All functions return a consistent shape:
 *  {
 *    data: T[],
 *    isFromDatabase: boolean,   // true = live Supabase, false = local
 *    error: Error | null
 *  }
 *
 * ADMIN USAGE:
 *  When Supabase is connected, content managers can update data directly
 *  in the Supabase dashboard — no deployments or code changes needed.
 *  Toggle `is_active` on any row to show/hide it from the website.
 *
 * LOCAL FALLBACK FILES:
 *  src/data/servicesData.js  → SERVICES, ADD_ONS
 *  src/data/galleryData.js   → GALLERY_ITEMS
 *  src/data/faqData.js       → FAQS
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { SERVICES, ADD_ONS } from "../data/servicesData";
import { GALLERY_ITEMS } from "../data/galleryData";
import { FAQS } from "../data/faqData";
import { LEGAL_DOCS } from "../data/legalData";
import { TEAM } from "../data/aboutData";

// ── Helper ────────────────────────────────────────────────────────────────────

/** Builds a consistent return object */
function result(data, isFromDatabase = false, error = null) {
  return { data, isFromDatabase, error };
}

/** Wraps a Supabase query with automatic local fallback — ONLY on errors, never on empty results */
async function fetchWithFallback({ query, fallbackData, transform }) {
  if (!isSupabaseConfigured) {
    return result(fallbackData, false);
  }
  try {
    const { data, error } = await query();
    // Only fall back on actual errors — NOT on empty arrays.
    // An empty DB means "no content yet", not "use local fake data".
    if (error) {
      console.warn('[contentService] Supabase error, using local fallback:', error.message);
      return result(fallbackData, false, error);
    }
    if (data === null || data === undefined) {
      return result(fallbackData, false);
    }
    const transformed = transform ? transform(data) : data;
    return result(transformed, true);
  } catch (err) {
    console.warn('[contentService] Unexpected error, using local fallback:', err);
    return result(fallbackData, false, err);
  }
}


// ── Services ──────────────────────────────────────────────────────────────────

/**
 * Fetch all active photography services.
 * Supabase table: `services` (columns: id, slug, name, category,
 *   description, tagline, tiers jsonb, inclusions jsonb[], cover_image,
 *   is_active, sort_order)
 */
export async function getServices() {
  return fetchWithFallback({
    query: () =>
      supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    fallbackData: SERVICES,
    transform: (rows) => {
      if (!rows || rows.length === 0) return SERVICES;

      // Check if both 'senior-high-packages' and legacy 'studio-packages' exist
      const hasSeniorHigh = rows.some((r) => r.slug === "senior-high-packages");

      const results = [];
      const seenSlugs = new Set();

      for (const row of rows) {
        // Skip duplicate legacy alias row if senior-high-packages is present
        if (row.slug === "studio-packages" && hasSeniorHigh) {
          continue;
        }

        const canonicalSlug = row.slug === "studio-packages" ? "senior-high-packages" : row.slug;
        if (seenSlugs.has(canonicalSlug)) continue;
        seenSlugs.add(canonicalSlug);

        // Find optional fallback template from static data for any unpopulated field
        const fallback = SERVICES.find(
          (s) => s.slug === canonicalSlug || s.id === canonicalSlug || s.slug === row.slug
        );

        results.push({
          id: row.id || fallback?.id || canonicalSlug,
          slug: canonicalSlug,
          category: row.category || fallback?.category || "general",
          name: row.name || fallback?.name || "Photography Service",
          tagline: row.tagline || fallback?.tagline || "",
          description: row.description || fallback?.description || "",
          coverImage: row.cover_image || fallback?.coverImage || "",
          galleryImages: (Array.isArray(row.gallery_images) && row.gallery_images.length > 0)
            ? row.gallery_images
            : (fallback?.galleryImages || []),
          inclusions: (Array.isArray(row.inclusions) && row.inclusions.length > 0)
            ? row.inclusions
            : (fallback?.inclusions || []),
          // Database tiers are the single source of truth; fallback only if DB array is empty
          tiers: (Array.isArray(row.tiers) && row.tiers.length > 0)
            ? row.tiers
            : (fallback?.tiers || []),
          paymentPolicy: row.payment_policy || fallback?.paymentPolicy || "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
          turnaround: row.turnaround || fallback?.turnaround || "5–7 business days",
          location: row.location || fallback?.location || "Studio",
          sortOrder: row.sort_order ?? fallback?.sortOrder ?? 0,
          isActive: row.is_active ?? true,
          basePrice: row.base_price,
          downPaymentAmount: row.down_payment_amount,
        });
      }

      return results.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
  });
}

// ── Add-Ons ───────────────────────────────────────────────────────────────────

export async function getAddOns() {
  return fetchWithFallback({
    query: () =>
      supabase
        .from("add_ons")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    fallbackData: ADD_ONS,
    transform: (rows) => {
      // Strictly deduplicate by normalized name to eliminate repetitive database entries
      const seen = new Set();
      const uniqueRows = [];
      for (const row of rows) {
        const normName = (row.name || "").trim().toLowerCase();
        if (normName && !seen.has(normName)) {
          seen.add(normName);
          uniqueRows.push(row);
        }
      }

      return uniqueRows.map((row) => {
        // Handle both string format "+₱1,500" and numeric format 1500
        let parsedPrice = row.price;
        if (typeof row.price === "string") {
          const numericString = row.price.replace(/[^\d.]/g, "");
          parsedPrice = parseFloat(numericString) || 0;
        }
        const formattedPrice = typeof row.price === "string" 
          ? row.price 
          : `+₱${Number(row.price || 0).toLocaleString("en-PH")}`;

        return { 
          id: row.id,
          name: row.name, 
          category: row.category || "General Extras",
          description: row.description || "",
          price: parsedPrice,
          rawPrice: formattedPrice,
        };
      });
    },
  });
}

// ── Gallery ───────────────────────────────────────────────────────────────────

/**
 * Fetch all public gallery items.
 * Supabase table: `gallery_items` (columns: id, title, category,
 *   image_url, is_public, sort_order)
 */
export async function getGalleryItems() {
  return fetchWithFallback({
    query: () =>
      supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true }),
    fallbackData: GALLERY_ITEMS,
    transform: (rows) =>
      rows.map((row) => ({
        id:          row.id,
        title:       row.title,
        category:    row.category,
        image:       row.image_url,
        beforeImage: row.before_image,
        description: row.description,
        likes:       row.likes || 0,
        badges:      row.badges || [],
      })),
  });
}

// ── Announcements ─────────────────────────────────────────────────────────────

/**
 * Fetch active announcements / promo bar messages.
 * Supabase table: `announcements` (columns: id, text, cta_text,
 *   cta_link, type, is_active, sort_order)
 */
export async function getAnnouncements() {
  return fetchWithFallback({
    query: () =>
      supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    fallbackData: [], // AnnouncementBar has its own default array
    transform: (rows) =>
      rows.map((row) => ({
        id:      row.id,
        text:    row.text,
        ctaText: row.cta_text,
        ctaLink: row.cta_link,
        type:    row.type ?? "info",
      })),
  });
}

// ── FAQs ──────────────────────────────────────────────────────────────────────

/**
 * Fetch FAQs.
 * Supabase table: `faqs` (columns: id, question, answer, topic, sort_order)
 */
export async function getFaqs() {
  return fetchWithFallback({
    query: () =>
      supabase
        .from("faqs")
        .select("*")
        .order("sort_order", { ascending: true }),
    fallbackData: FAQS,
    transform: (rows) =>
      rows.map((row) => ({
        id:       row.id,
        question: row.question,
        answer:   row.answer,
        topic:    row.category || row.topic || 'General',
        category: row.category || row.topic || 'General',
      })),
  });
}

// ── Studio Settings ───────────────────────────────────────────────────────────

/**
 * Fetch a single studio setting value by key.
 * Supabase table: `studio_settings` (columns: key, value, updated_at)
 *
 * Example:
 *   const { data } = await getSetting("hero_headline");
 */
export async function getSetting(key, fallback = null) {
  if (!isSupabaseConfigured) return result(fallback, false);
  try {
    const { data, error } = await supabase
      .from("studio_settings")
      .select("value")
      .eq("key", key)
      .single();
    if (error || !data) return result(fallback, false, error);
    return result(data.value, true);
  } catch (err) {
    return result(fallback, false, err);
  }
}

// ── Legal Documents ───────────────────────────────────────────────────────────

/**
 * Fetch a legal document by slug (e.g., "privacy", "terms")
 * Supabase table: `legal_docs` (columns: slug, title, content, updated_at)
 */
export async function getLegalDoc(slug) {
  const fallback = LEGAL_DOCS[slug] || { title: "Not Found", content: "Document not found." };
  
  if (!isSupabaseConfigured) {
    return result(fallback, false);
  }
  try {
    const { data, error } = await supabase
      .from("legal_docs")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error || !data) return result(fallback, false, error);
    
    return result({
      title: data.title,
      content: data.content,
      lastUpdated: new Date(data.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }, true);
  } catch (err) {
    return result(fallback, false, err);
  }
}

// ── Team Members ──────────────────────────────────────────────────────────────

/**
 * Fetch all team members for the about page.
 * Supabase table: `team_members` (columns: id, name, role, bio, image, sort_order)
 */
export async function getTeamMembers() {
  return fetchWithFallback({
    query: () =>
      supabase
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true }),
    fallbackData: TEAM,
    transform: (rows) =>
      rows.map((row) => ({
        id:    row.id,
        name:  row.name,
        role:  row.role,
        bio:   row.bio,
        image: row.image,
        specializations: [],
        initials: row.name ? row.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "??",
        social: {},
      })),
  });
}
