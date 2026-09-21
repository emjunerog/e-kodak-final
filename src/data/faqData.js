/**
 * faqData.js
 * ==========
 * FREQUENTLY ASKED QUESTIONS
 *
 * Used on: Services page, Contact page
 *
 * HOW TO EDIT:
 *  - Add/remove questions by editing the arrays below.
 *  - Questions are grouped by topic for easy scanning.
 *
 * FUTURE: FAQ content can be managed by admin through the
 * dashboard and stored in a `faqs` Supabase table.
 */

export const FAQ_TOPICS = [
  { id: "booking",  label: "Booking & Process" },
  { id: "pricing",  label: "Pricing & Packages" },
  { id: "session",  label: "During Your Session" },
  { id: "delivery", label: "Photo Delivery" },
];

export const FAQS = [
  // ── Booking & Process ────────────────────────────────────────────────────────
  {
    id: "how-to-book",
    topic: "booking",
    question: "How do I book a photography session?",
    answer:
      "You can book a session directly through our website. Create a free account, browse our services, select your preferred package, choose a date and time, provide your session details, and submit your booking request. Our team will confirm your booking within 24 hours.",
  },
  {
    id: "confirmation-time",
    topic: "booking",
    question: "How long does booking confirmation take?",
    answer:
      "We confirm all bookings within 24 hours on business days (Monday–Saturday). You will receive an email and in-app notification once your booking is confirmed. For urgent bookings, you may contact us directly via phone or Facebook.",
  },
  {
    id: "cancel-reschedule",
    topic: "booking",
    question: "Can I cancel or reschedule my session?",
    answer:
      "Yes. You may request a reschedule at least 48 hours before your session at no additional charge. Cancellations made less than 48 hours before the session may be subject to a rescheduling fee. Sessions can be managed directly through your online dashboard.",
  },
  {
    id: "deposit",
    topic: "booking",
    question: "Is a deposit required to book?",
    answer:
      "Yes, a 50% non-refundable deposit is required to secure your booking date. The remaining balance is due on or before the day of your session. Deposit details will be provided upon booking confirmation.",
  },
  {
    id: "reference-images",
    topic: "booking",
    question: "Can I submit reference or inspiration images?",
    answer:
      "Absolutely — we encourage it! During the booking process, you can upload reference images (pegs) to help us understand your preferred style, mood, and poses. This helps us prepare and ensures we're aligned before your session.",
  },

  // ── Pricing & Packages ────────────────────────────────────────────────────────
  {
    id: "whats-included",
    topic: "pricing",
    question: "What's included in the package price?",
    answer:
      "Each package includes a specified number of professionally edited digital photos, an online gallery for download, and all editing work. Some packages also include printed photos. Please check each package's inclusion list for exact details.",
  },
  {
    id: "extra-photos",
    topic: "pricing",
    question: "Can I purchase additional edited photos?",
    answer:
      "Yes. Additional edited photos can be purchased as an add-on for ₱800 per 10 photos. This can be arranged after your session if you'd like more than your package includes.",
  },
  {
    id: "custom-package",
    topic: "pricing",
    question: "Can I request a custom package?",
    answer:
      "Yes. If none of our standard packages exactly match your needs, contact us and we'll work out a custom arrangement. This is especially common for commercial, multi-day, and multi-photographer bookings.",
  },
  {
    id: "payment-methods",
    topic: "pricing",
    question: "What payment methods do you accept?",
    answer:
      "We currently accept GCash, Maya, bank transfer (BDO / BPI), and cash. Payment details will be provided in your booking confirmation. Online card payment integration is planned for a future update.",
  },

  // ── During Your Session ───────────────────────────────────────────────────────
  {
    id: "what-to-wear",
    topic: "session",
    question: "What should I wear for my session?",
    answer:
      "We'll discuss this during your pre-session consultation! Generally: avoid busy patterns, logos, and neon colors. Solid, neutral, or complementary tones photograph beautifully. Bring a backup outfit if possible. Our photographers will guide you based on your specific session type.",
  },
  {
    id: "bring-to-session",
    topic: "session",
    question: "What should I bring to my session?",
    answer:
      "Bring your outfits, any props you'd like to use, and your reference images if you have them. For outdoor sessions, bring comfortable shoes. For studio sessions, touch-up makeup and a hairbrush are helpful. Your booking QR code (from the mobile app or website) gives our team quick access to your booking details.",
  },
  {
    id: "session-duration",
    topic: "session",
    question: "How long will my session take?",
    answer:
      "Session duration depends on your package. Basic packages run 45–90 minutes. Standard packages run 2–3 hours. Premium and full-day packages can run 4–8 hours. Allow extra time for travel between locations if applicable.",
  },
  {
    id: "can-i-bring-people",
    topic: "session",
    question: "Can I bring a friend or family member to my session?",
    answer:
      "Yes, you're welcome to bring one support person. We do ask that large groups not be present as they can affect the focus and direction of the session. For group or family sessions, everyone involved in the shoot is of course expected to attend.",
  },

  // ── Photo Delivery ────────────────────────────────────────────────────────────
  {
    id: "delivery-time",
    topic: "delivery",
    question: "When will I receive my edited photos?",
    answer:
      "Standard turnaround is 5–7 business days for portrait and family sessions, and 7–10 business days for events. Rush delivery (3 business days) is available as a paid add-on. You'll receive a notification when your gallery is ready.",
  },
  {
    id: "how-delivered",
    topic: "delivery",
    question: "How will my photos be delivered?",
    answer:
      "Your edited photos will be available in your private online gallery — accessible through your E-Kodak account on our website or mobile app. You can view, download, and share directly from your gallery. Photos are delivered in high-resolution, print-ready format.",
  },
  {
    id: "gallery-access-duration",
    topic: "delivery",
    question: "How long will my gallery be available?",
    answer:
      "Your online gallery will remain accessible for 12 months from the delivery date. We strongly recommend downloading your photos promptly. After 12 months, photos may be archived. Contact us if you need extended access.",
  },
  {
    id: "raw-files",
    topic: "delivery",
    question: "Do you provide raw/unedited files?",
    answer:
      "We do not provide raw or unedited files as standard. Our editing is an integral part of the service and the final photos reflect our professional standards. Edited high-resolution files are provided in JPEG format at print-ready resolution.",
  },
];
