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

        const SERVICE_SLUG_TO_UUID = {
          "senior-high-packages": "1471388e-b74f-41ec-96c8-1d220d557a89",
          "studio-packages": "1471388e-b74f-41ec-96c8-1d220d557a89",
          "wedding-photo": "cd4271d4-8dd3-472f-86e5-0b658af9b02b",
          "wedding-video": "aab20afd-0e3c-41b2-8f70-0ab42167c50a",
          "college-packages": "e2415838-06be-4e80-aa7a-9f4d3b47a8a5",
        };

        const resolvedId = row.id || fallback?.id || SERVICE_SLUG_TO_UUID[canonicalSlug] || canonicalSlug;

        const effectiveCover = row.cover_image || fallback?.coverImage || fallback?.cover_image || "";

        results.push({
          id: resolvedId,
          slug: canonicalSlug,
          category: row.category || fallback?.category || "general",
          name: row.name || fallback?.name || "Photography Service",
          tagline: row.tagline || fallback?.tagline || "",
          description: row.description || fallback?.description || "",
          coverImage: effectiveCover,
          cover_image: effectiveCover,
          galleryImages: (Array.isArray(row.gallery_images) && row.gallery_images.length > 0)
            ? row.gallery_images
            : (fallback?.galleryImages || []),
          gallery_images: (Array.isArray(row.gallery_images) && row.gallery_images.length > 0)
            ? row.gallery_images
            : (fallback?.galleryImages || []),
          inclusions: (Array.isArray(row.inclusions) && row.inclusions.length > 0)
            ? row.inclusions
            : (fallback?.inclusions || []),
          tiers: (Array.isArray(row.tiers) && row.tiers.length > 0)
            ? row.tiers
            : (fallback?.tiers || []),
          paymentPolicy: row.payment_policy || fallback?.paymentPolicy || "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
          payment_policy: row.payment_policy || fallback?.paymentPolicy || "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
          turnaround: row.turnaround || fallback?.turnaround || "5–7 business days",
          location: row.location || fallback?.location || "Studio",
          sortOrder: row.sort_order ?? fallback?.sortOrder ?? 0,
          sort_order: row.sort_order ?? fallback?.sortOrder ?? 0,
          isActive: row.is_active ?? true,
          is_active: row.is_active ?? true,
          basePrice: row.base_price ?? fallback?.basePrice ?? 0,
          base_price: row.base_price ?? fallback?.basePrice ?? 0,
          downPaymentAmount: row.down_payment_amount ?? fallback?.downPaymentAmount ?? 0,
          down_payment_amount: row.down_payment_amount ?? fallback?.downPaymentAmount ?? 0,
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
          // Display string matching the static ADD_ONS shape (e.g. "+₱1,500")
          price: formattedPrice,
          // Numeric value for math (booking totals, etc.)
          priceValue: parsedPrice,
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

/**
 * Submit a customer best capture to the studio gallery showcase.
 */
export async function submitCustomerBestCapture({
  bookingId = null,
  title,
  category = 'graduation',
  imageUrl = '',
  file = null,
  description = '',
  customerName = ''
}) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Database not configured') };
  try {
    let resolvedImageUrl = (imageUrl || '').trim();

    if (file) {
      try {
        const safeName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { error: upErr } = await supabase.storage
          .from('booking-references')
          .upload(`customer-captures/${safeName}`, file, { upsert: true });

        if (!upErr) {
          const { data: urlData } = supabase.storage
            .from('booking-references')
            .getPublicUrl(`customer-captures/${safeName}`);
          if (urlData?.publicUrl) {
            resolvedImageUrl = urlData.publicUrl;
          }
        }
      } catch (uploadCatch) {
        console.warn('Storage upload for customer capture caught:', uploadCatch);
      }
    }

    if (!resolvedImageUrl) {
      return { data: null, error: new Error('Please select an image deliverable or upload a photo.') };
    }

    const payload = {
      title: (title || 'My Graduation Milestone').trim(),
      category: (category || 'graduation').toLowerCase(),
      image_url: resolvedImageUrl,
      description: description.trim() 
        ? `${description.trim()}${customerName ? ` — Shared by ${customerName}` : ''}` 
        : (customerName ? `Shared by client ${customerName}` : ''),
      is_public: true,
      likes: 0,
      sort_order: 10,
      badges: ['Client Capture', 'Verified Graduate']
    };
    if (bookingId) payload.booking_id = bookingId;

    const { data, error } = await supabase
      .from('gallery_items')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('submitCustomerBestCapture error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch customer best captures for a specific user/booking.
 */
export async function getCustomerBestCaptures(bookingId = null) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    let query = supabase
      .from('gallery_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('getCustomerBestCaptures error:', err);
    return { data: [], error: err };
  }
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
    transform: (rows) => {
      // 1) The `category` column defaults to 'General' for every row and used to
      //    mask the real topic — prefer the dedicated `topic` column.
      // 2) Deduplicate repeated rows (same question seeded multiple times).
      const seen = new Set();
      const items = [];
      for (const row of rows) {
        const question = (row.question || "").trim();
        const key = question.toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const topic = (row.topic || row.category || "general").trim().toLowerCase();
        items.push({
          id:       row.id,
          question,
          answer:   row.answer,
          topic,
          category: topic,
        });
      }
      return items;
    },
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
