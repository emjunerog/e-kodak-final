/**
 * AIAssistant.jsx
 * ===============
 * MULTI-PORTAL AI STUDIO ASSISTANT & CO-PILOT
 *
 * Fully overhauled:
 *  - Single unified top header with back navigation and persona indicators
 *  - Fixed vertical flex layout with smooth internal scrolling
 *  - Clean Markdown parsing without duplicated asterisks or bullet clutter
 *  - High-contrast card typography and vibrant icon badges
 *  - Persona-aware for Public, Admin, Photographer, and Customer portals
 *  - Powered by Google Gemini API (gemini-2.5-flash)
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { siteConfig } from "../../config/siteConfig";
import { getServices, getFaqs } from "../../services/contentService";
import { getAiClient } from "../../lib/ai";
import "./AIAssistant.bootstrap.css";

const aiClient = getAiClient();

// ── Markdown Formatter with Clean Bullets & Copy ───────────────────────────────

function FormatMessage({ text }) {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderInlineFormatted = (str) => {
    return str.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="fw-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const lines = text.split("\n");

  return (
    <div className="position-relative">
      <div className="d-flex flex-column gap-1">
        {lines.map((rawLine, i) => {
          const trimmed = rawLine.trim();
          if (!trimmed) return <div key={i} style={{ height: "0.35rem" }} />;

          // Bullet items (*, -, •) -> strip bullet prefix completely before rendering
          if (/^[*\-•]\s+/.test(trimmed)) {
            const stripped = trimmed.replace(/^[*\-•]\s+/, "");
            return (
              <div key={i} className="d-flex align-items-start gap-2 ms-1 my-0.5">
                <i className="bi bi-circle-fill text-warning mt-1.5 flex-shrink-0" style={{ fontSize: "0.32rem" }}></i>
                <div className="flex-grow-1" style={{ fontSize: "0.83rem", lineHeight: "1.45" }}>
                  {renderInlineFormatted(stripped)}
                </div>
              </div>
            );
          }

          // Numbered list items (1., 2., etc.)
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={i} className="d-flex align-items-start gap-2 ms-1 my-0.5">
                <span
                  className="badge bg-warning text-dark rounded-circle px-1 py-0 flex-shrink-0 d-flex align-items-center justify-content-center"
                  style={{ width: "1.1rem", height: "1.1rem", fontSize: "0.62rem" }}
                >
                  {numMatch[1]}
                </span>
                <div className="flex-grow-1" style={{ fontSize: "0.83rem", lineHeight: "1.45" }}>
                  {renderInlineFormatted(numMatch[2])}
                </div>
              </div>
            );
          }

          // Markdown headers (### or ##)
          if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
            const headerText = trimmed.replace(/^#+\s*/, "");
            return (
              <div key={i} className="fw-bold text-warning text-uppercase mt-2 mb-0.5" style={{ letterSpacing: "0.05em", fontSize: "0.74rem" }}>
                {headerText}
              </div>
            );
          }

          // Regular paragraph
          return (
            <div key={i} className="mb-1" style={{ fontSize: "0.83rem", lineHeight: "1.45" }}>
              {renderInlineFormatted(trimmed)}
            </div>
          );
        })}
      </div>

      {/* Copy Response Button */}
      <div className="d-flex justify-content-end mt-2 pt-1 border-top border-secondary-subtle">
        <button
          onClick={handleCopy}
          title="Copy response"
          className={`ai-bubble-copy-btn ${copied ? "copied" : ""}`}
        >
          <i className={copied ? "bi bi-check2 text-success" : "bi bi-clipboard"}></i>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

// ── Multi-Portal Configurations ───────────────────────────────────────────────

const PORTAL_CONFIGS = {
  admin: {
    roleLabel: "Admin Operations",
    title: "Studio Operations Co-Pilot",
    greeting: "Hello, Admin! 👋",
    description: "How can I assist studio operations today?",
    quickChips: [
      "Draft shoot reminder SMS",
      "Draft 50% deposit reminder",
      "Draft photos ready notice",
      "Photographer matching guide",
      "Explain 7-stage booking flow",
    ],
    quickActions: [
      { id: "drafts", label: "Message Templates", desc: "1-Click SMS & Email", icon: "bi bi-magic", iconBg: "rgba(244, 114, 182, 0.2)", iconColor: "#f472b6" },
      { id: "dispatch", label: "Dispatch Advisor", desc: "Photographer Matching", icon: "bi bi-person-check-fill", iconBg: "rgba(56, 189, 248, 0.2)", iconColor: "#7dd3fc" },
      { id: "policy", label: "Studio Policies", desc: "Booking & Flow Rules", icon: "bi bi-shield-check", iconBg: "rgba(52, 211, 153, 0.2)", iconColor: "#6ee7b7" },
    ],
  },
  photographer: {
    roleLabel: "Photographer Field",
    title: "Photographer Field Guide",
    greeting: "Hi Photographer! 📷",
    description: "Ready for your next studio session?",
    quickChips: [
      "Toga & Barong posing guide",
      "Studio portrait lighting tips",
      "Pre-shoot gear checklist",
      "Workflow: When to set CAPTURE?",
    ],
    quickActions: [
      { id: "posing", label: "Posing Guide", desc: "Toga, Barong & Formal", icon: "bi bi-camera2", iconBg: "rgba(168, 85, 247, 0.2)", iconColor: "#c084fc" },
      { id: "checklist", label: "Gear Checklist", desc: "Lenses, Triggers & Bay", icon: "bi bi-layers-fill", iconBg: "rgba(52, 211, 153, 0.2)", iconColor: "#6ee7b7" },
    ],
  },
  dashboard: {
    roleLabel: "Booking Support",
    title: "Client Booking Concierge",
    greeting: "Welcome to your booking concierge! ✨",
    description: "Your personal guide for shoots, payments, and photos.",
    quickChips: [
      "What should I bring to my shoot?",
      "How to pay remaining balance?",
      "When will photos be delivered?",
      "Can I reschedule my session?",
    ],
    quickActions: [
      { id: "prep", label: "Shoot Prep Tips", desc: "Wardrobe & Arrival Guide", icon: "bi bi-camera2", iconBg: "rgba(52, 211, 153, 0.2)", iconColor: "#6ee7b7" },
      { id: "faq", label: "Booking FAQs", desc: "Common Questions", icon: "bi bi-question-circle-fill", iconBg: "rgba(56, 189, 248, 0.2)", iconColor: "#7dd3fc" },
    ],
  },
  public: {
    roleLabel: "Studio Guide",
    title: "E-Kodak Studio Concierge",
    greeting: "Hi! 👋 Welcome to E-Kodak Studio!",
    description: "I can help you choose packages, check rates, and answer questions.",
    quickChips: [
      "Compare graduation packages",
      "How much is the deposit?",
      "What is included in Set A?",
      "What should I wear for portraits?",
    ],
    quickActions: [
      { id: "match", label: "Find My Package", desc: "Smart Package Matcher", icon: "bi bi-box-seam-fill", iconBg: "rgba(201, 169, 110, 0.25)", iconColor: "#f5d89f" },
      { id: "pricing", label: "See Pricing", desc: "Official 2026 Rates", icon: "bi bi-star-fill", iconBg: "rgba(56, 189, 248, 0.2)", iconColor: "#7dd3fc" },
      { id: "prep", label: "Shoot Prep Tips", desc: "How to Prepare", icon: "bi bi-camera2", iconBg: "rgba(52, 211, 153, 0.2)", iconColor: "#6ee7b7" },
      { id: "faq", label: "Common Questions", desc: "Booking & Policies", icon: "bi bi-question-circle-fill", iconBg: "rgba(168, 85, 247, 0.2)", iconColor: "#c084fc" },
    ],
  },
};

// ── Preset Knowledge ──────────────────────────────────────────────────────────

const PACKAGE_MATCH = {
  portrait:          { name: "Portrait Photography",    price: "from ₱3,500",   link: "/services", icon: "bi bi-person-badge" },
  "college-packages":{ name: "College Packages",        price: "from ₱3,575",   link: "/services", icon: "bi bi-mortarboard" },
  "studio-packages": { name: "Studio & Toga Packages",  price: "from ₱795",     link: "/services", icon: "bi bi-camera" },
  event:             { name: "Event Photography",        price: "from ₱8,000",   link: "/services", icon: "bi bi-calendar2-event" },
  family:            { name: "Family Photography",       price: "from ₱4,000",   link: "/services", icon: "bi bi-people" },
  couple:            { name: "Couple Photography",       price: "from ₱6,000",   link: "/services", icon: "bi bi-heart" },
  commercial:        { name: "Commercial & Branding",    price: "from ₱8,000",   link: "/services", icon: "bi bi-building" },
};

const PRICING_INFO = [
  { type: "Portrait",              badge: "Studio Session", note: "Basic: ₱3,500 · Standard: ₱5,500 · Premium: ₱8,500" },
  { type: "College Packages",      badge: "Best Seller",    note: "Set A: ₱4,875 · Set B: ₱3,575 (Free makeup & hair)" },
  { type: "Studio & Toga",         badge: "Quick Shoot",    note: "Set A: ₱1,750 · Set B: ₱1,425 · Set C: ₱1,100 · Set D: ₱795" },
  { type: "Event Photography",     badge: "Coverage",       note: "Half-Day: ₱8,000 · Full-Day: ₱14,000 · Full-Day Duo: ₱20,000" },
  { type: "Family Photography",    badge: "Group Session",  note: "Mini: ₱4,000 · Standard: ₱6,000 · Extended: ₱9,000" },
  { type: "Couple / Prenuptial",   badge: "Romantic",       note: "Classic: ₱6,000 · Signature: ₱10,000 · Cinematic: ₱16,000" },
  { type: "Commercial & Branding", badge: "Brand Shoot",    note: "Starter: ₱8,000 · Pro: ₱15,000 · Campaign: Custom" },
];

const PREP_TIPS = [
  { title: "What to wear", tip: "Wear solid colors that complement your skin tone. Avoid busy patterns and loud stripes.", icon: "bi bi-palette" },
  { title: "Arrive early", tip: "Plan to arrive 10–15 minutes early so we can review the shoot plan, styling, and lighting.", icon: "bi bi-clock-history" },
  { title: "Bring outfit options", tip: "Bring 2–3 outfit options on hangers to give yourself diverse portrait looks.", icon: "bi bi-bag-check" },
  { title: "Graduation attire", tip: "Bring your official graduation collar/hood, toga cap, and formal white inner shirt/blouse.", icon: "bi bi-mortarboard" },
  { title: "Photo delivery", tip: "Edited photos are delivered within 5–7 business days via your private online client gallery.", icon: "bi bi-cloud-arrow-down" },
];

const FAQS = [
  { q: "How do I confirm my booking?", a: "A 50% down payment is required to confirm your slot. Once paid, our staff verifies your payment and assigns a photographer." },
  { q: "When is the remaining balance due?", a: "The remaining balance is due on or before the day of your photo session." },
  { q: "Can I reschedule my session?", a: "Yes, you can request a reschedule at least 48 hours prior to your session date, subject to slot availability." },
  { q: "Are RAW files included?", a: "Our packages include professionally edited, high-resolution digital files. Unedited RAW files are not included unless specified in custom commercial contracts." },
];

const ADMIN_PRESET_MESSAGES = [
  {
    title: "50% Down Payment Reminder",
    badge: "Deposit Call",
    text: "Hi [Client Name]! This is E-Kodak Photography Studio. Your booking #[Booking Number] for [Service Name] on [Date] is pending confirmation. To secure your slot, kindly settle the 50% down payment (₱[Amount]) via GCash/Bank Transfer. Thank you!",
  },
  {
    title: "Day-Before Shoot Reminder",
    badge: "Schedule Call",
    text: "Hello [Client Name]! Reminder of your scheduled photo shoot tomorrow, [Date] at [Time] at E-Kodak Studio. Please arrive 10-15 minutes early with your wardrobe options. See you soon!",
  },
  {
    title: "Photos Ready for Viewing",
    badge: "Delivery Notice",
    text: "Great news, [Client Name]! Your photos for booking #[Booking Number] are now ready! You can view and download them in your client gallery portal at ekodak.com/dashboard/gallery. Enjoy!",
  },
  {
    title: "Balance Settlement Notice",
    badge: "Settlement",
    text: "Hi [Client Name]! Your remaining balance for booking #[Booking Number] is ₱[Amount]. Kindly settle this upon arrival at the studio. See you at your session!",
  },
];

// ── Interactive Screen Components ─────────────────────────────────────────────

function ChatScreen({ portal, initialPrompt, onResetChatRef }) {
  const MAX_MESSAGES = 30;
  const config = PORTAL_CONFIGS[portal] || PORTAL_CONFIGS.public;

  const [messages, setMessages] = useState([
    {
      role: "model",
      text: config.greeting + (portal === 'admin'
        ? " Ask me to draft client messages, check booking rules, or give photographer dispatch advice."
        : " Ask me anything about our packages, shoot preparation, or studio services!"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dbContext, setDbContext] = useState("");
  const endOfMessagesRef = useRef(null);

  // Allow parent header to reset chat
  useEffect(() => {
    if (onResetChatRef) {
      onResetChatRef.current = () => {
        setMessages([
          {
            role: "model",
            text: config.greeting + " Chat session refreshed. How can I help you next?",
          },
        ]);
      };
    }
  }, [onResetChatRef, config.greeting]);

  // Fetch live context from database
  useEffect(() => {
    async function loadContext() {
      try {
        const [servicesRes, faqsRes] = await Promise.all([getServices(), getFaqs()]);
        let ctx = "Studio Services: ";
        if (servicesRes.data) {
          ctx += servicesRes.data.map(s => `${s.name} (${s.category})`).join(", ");
        }
        if (faqsRes.data) {
          ctx += " | FAQs: " + faqsRes.data.map(f => `Q: ${f.question} A: ${f.answer}`).join(" | ");
        }
        setDbContext(ctx);
      } catch (err) {
        console.error("Failed to load AI context", err);
      }
    }
    loadContext();
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (userMessage) => {
    if (!userMessage.trim() || !aiClient || messages.length >= MAX_MESSAGES) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      let systemInstruction = "";

      if (portal === "admin") {
        systemInstruction = `You are Koda Admin Co-Pilot, the specialized AI operations assistant for E-Kodak Photography Studio staff and administrators.
You assist with:
1. Drafting polite, professional, and clear SMS or email templates for customers (down payment reminders, call times, venue directions, photos ready notices).
2. Photographer Dispatch: Explaining photographer matching (Studio/Barong/Toga -> Portrait specialists; Events/Weddings -> Event documentary specialists; Commercial -> Lighting/Product specialists).
3. Lifecycle & Workflow Rules:
   - Status Flow: PENDING -> CONFIRMED -> PHOTOGRAPHER_ASSIGNED -> CAPTURE -> EDITING -> PRINTING -> READY -> COMPLETED.
   - Financial Policy: 50% non-refundable down payment required to confirm. Remaining balance due on shoot day.
   - Reassignment: Bookings can be reassigned or unassigned back to CONFIRMED.
4. Keep answers sharp, structured, actionable, and formatted with clean bullet points and bold highlights.
Context: ${dbContext}`;
      } else if (portal === "photographer") {
        systemInstruction = `You are Koda Photographer Field Assistant for E-Kodak studio photographers.
You help photographers on shoot day with:
1. Posing & Lighting: Guidance on toga/barong graduation poses, formal corporate portraits, and family grouping.
2. Equipment & Prep: Pre-shoot checklists (lenses, lighting triggers, memory cards).
3. Session Workflow: Progressing status to CAPTURE during shoot, then EDITING, then READY.
Keep advice practical, encouraging, and professional.`;
      } else if (portal === "dashboard") {
        systemInstruction = `You are Koda Client Concierge for booked E-Kodak customers.
You guide customers with their existing bookings:
- What to bring on shoot day (wardrobe, graduation collars).
- Remaining balance payment policies (due on shoot day).
- Turnaround time for photo outputs (5-7 business days).
Be warm, reassuring, and concise.`;
      } else {
        systemInstruction = `You are Koda, E-Kodak Photography Studio's friendly AI concierge for prospective clients.
You help clients choose packages, compare graduation sets (Set A vs Set B), explain pricing, and guide them to book.
Core products:
- College Packages (Set A ₱4,875, Set B ₱3,575 - includes free hair and makeup)
- Studio & Toga Packages (Set A ₱1,750, Set B ₱1,425, Set C ₱1,100, Set D ₱795)
- Other: Portrait ₱3,500-₱8,500 | Event ₱8,000-₱20,000 | Family ₱4,000-₱9,000
Payment rule: 50% down payment required.
Context: ${dbContext}`;
      }

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          ...history,
          { role: "user", parts: [{ text: userMessage }] },
        ],
        config: {
          systemInstruction,
        },
      });

      setMessages(prev => [...prev, { role: "model", text: response.text }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          text: "I encountered a connection hiccup with the AI service. Please verify your internet connection or API settings.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  // Auto-send initial prompt if triggered from outside
  const initialSentRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessageRef.current(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Suggestion Chips (Compact Horizontal Carousel) */}
      <div className="ai-chips-scroll">
        {config.quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(chip)}
            disabled={isTyping}
            className="ai-chip-pill"
          >
            <i className="bi bi-stars text-warning" style={{ fontSize: "0.68rem" }}></i>
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="ai-msg-stream">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="ai-user-row">
                <div className="ai-bubble-user">
                  {msg.text}
                </div>
                <div className="ai-avatar-user" title="You">
                  <i className="bi bi-person-fill"></i>
                </div>
              </div>
            ) : (
              <div className="ai-bot-row">
                <div className="ai-avatar-bot" title="Koda AI">
                  <i className="bi bi-robot"></i>
                </div>
                <div className="ai-bubble-bot">
                  <FormatMessage text={msg.text} />
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="ai-bot-row">
            <div className="ai-avatar-bot">
              <i className="bi bi-robot"></i>
            </div>
            <div className="ai-bubble-bot d-flex align-items-center gap-2 py-2 px-3">
              <span className="spinner-grow spinner-grow-sm text-warning" style={{ width: "0.55rem", height: "0.55rem" }} role="status"></span>
              <span className="small ms-1" style={{ color: "#d1cdc7", fontSize: "0.78rem" }}>Koda is thinking...</span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Docked Input Field */}
      <form onSubmit={handleSubmit} className="pt-2 border-top border-secondary-subtle flex-shrink-0 mt-auto">
        <div className="ai-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={aiClient ? "Message Koda AI..." : "Gemini API key missing"}
            disabled={!aiClient || isTyping}
            className="ai-input-field"
          />
          <button
            type="submit"
            disabled={!aiClient || !input.trim() || isTyping}
            className="ai-input-send-btn"
            title="Send message"
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Admin Presets Screen ──────────────────────────────────────────────────────

function AdminDraftsScreen({ onSendToChat }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {ADMIN_PRESET_MESSAGES.map((msg, i) => (
          <div key={i} className="ai-action-card mb-2">
            <div className="d-flex align-items-center justify-content-between w-100">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold text-warning small">{msg.title}</span>
                <span className="badge bg-secondary-subtle text-light small py-0.5 px-1.5" style={{ fontSize: "0.62rem" }}>
                  {msg.badge}
                </span>
              </div>
              <div className="d-flex align-items-center gap-1.5">
                <button
                  onClick={() => handleCopy(msg.text, i)}
                  className={`btn btn-sm py-1 px-2 ${copiedIdx === i ? 'btn-success' : 'btn-outline-light'} rounded-pill`}
                  style={{ fontSize: "0.7rem" }}
                >
                  <i className={`bi ${copiedIdx === i ? 'bi-check2' : 'bi-clipboard'} me-1`}></i>
                  {copiedIdx === i ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => onSendToChat(`Please customize this message template for a client: "${msg.text}"`)}
                  className="btn btn-sm btn-warning rounded-pill py-1 px-2.5 text-dark fw-bold"
                  style={{ fontSize: "0.7rem" }}
                >
                  <i className="bi bi-magic me-1"></i> Customize
                </button>
              </div>
            </div>
            <div
              className="p-2.5 rounded-3 w-100 font-monospace text-light small border border-secondary-subtle mt-1"
              style={{ background: "rgba(0, 0, 0, 0.4)", fontSize: "0.74rem", lineHeight: "1.45" }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDispatchGuideScreen({ onSendToChat }) {
  const dispatchRules = [
    {
      title: "Graduation & College Packages",
      target: "Studio Portrait Specialists",
      icon: "bi bi-mortarboard-fill",
      color: "text-warning",
      desc: "Requires high attention to toga hood, barong fold alignment, soft lighting, and formal posture.",
    },
    {
      title: "Wedding & Prenup / Couple",
      target: "Event / Cinematic Specialists",
      icon: "bi bi-heart-fill",
      color: "text-danger",
      desc: "Fast action handling, outdoor ambient exposure mastery, and romantic narrative direction.",
    },
    {
      title: "Family & Maternity",
      target: "Portrait & Lifestyle Specialists",
      icon: "bi bi-people-fill",
      color: "text-success",
      desc: "Patience with children, natural multi-person composition, and warm interactive poses.",
    },
    {
      title: "Commercial & Branding",
      target: "Technical Lighting Specialists",
      icon: "bi bi-building",
      color: "text-info",
      desc: "Sharp corporate composition, color accuracy, product staging, and brand guide compliance.",
    },
  ];

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {dispatchRules.map((rule, idx) => (
          <div key={idx} className="ai-action-card mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className={`bi ${rule.icon} ${rule.color} fs-6`}></i>
              <span className="fw-bold text-white small">{rule.title}</span>
            </div>
            <div className="badge bg-warning-subtle text-warning border border-warning-subtle py-1 px-2 rounded-pill small mb-1" style={{ fontSize: "0.68rem" }}>
              Recommended: {rule.target}
            </div>
            <p className="small mb-0" style={{ color: "#d1cdc7", fontSize: "0.75rem", lineHeight: "1.4" }}>
              {rule.desc}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSendToChat("Who should I assign for an upcoming graduation and family shoot?")}
        className="btn btn-warning w-100 rounded-pill py-2 text-dark fw-bold small d-flex align-items-center justify-content-center gap-2 flex-shrink-0 mt-auto shadow-sm"
      >
        <i className="bi bi-stars"></i>
        <span>Ask AI to Recommend for a Booking</span>
      </button>
    </div>
  );
}

function AdminPolicyScreen() {
  const policies = [
    {
      num: 1,
      title: "Booking Status Progression",
      content: "PENDING → CONFIRMED → PHOTOGRAPHER_ASSIGNED → CAPTURE → EDITING → PRINTING → READY → COMPLETED.",
    },
    {
      num: 2,
      title: "Payment Policy Rules",
      content: "50% non-refundable down payment is required to confirm reservation. Remaining balance is due on or before shoot date.",
    },
    {
      num: 3,
      title: "Photographer Reassignment",
      content: "Staff can reassign shoots to another photographer at any time before completion. Unassigning reverts status back to CONFIRMED.",
    },
    {
      num: 4,
      title: "Studio Toga Packages",
      content: "Studio Toga packages are non-transferable and strictly bound to designated student identity.",
    },
  ];

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {policies.map((p) => (
          <div key={p.num} className="ai-action-card mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: "1.25rem", height: "1.25rem", fontSize: "0.68rem" }}>
                {p.num}
              </span>
              <span className="fw-bold text-white small">{p.title}</span>
            </div>
            <p className="small mb-0" style={{ color: "#d1cdc7", fontSize: "0.76rem", lineHeight: "1.45" }}>
              {p.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Photographer Screens ──────────────────────────────────────────────────────

function PhotographerPosingScreen({ onSendToChat }) {
  const poses = [
    {
      title: "Toga & Barong Graduation",
      tip: "Turn shoulders 45° from key light. Align hood collar fold symmetrically. One hand lightly on lap, chin slightly forward.",
      icon: "bi bi-mortarboard",
    },
    {
      title: "Corporate Executive",
      tip: "Upright spine, shoulders back. Arms crossed with loose thumbs visible, or jacket adjustment stance. Chin angled 15°.",
      icon: "bi bi-briefcase",
    },
    {
      title: "Family Group Staging",
      tip: "Pyramid composition: tallest at center-back, seated members forward. Heads angled toward family center for warmth.",
      icon: "bi bi-people",
    },
    {
      title: "Couple & Prenup Romance",
      tip: "Forehead-to-forehead intimate gaze, gentle hand placement on jawline, and natural walking movement toward camera.",
      icon: "bi bi-heart",
    },
  ];

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {poses.map((p, idx) => (
          <div key={idx} className="ai-action-card mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className={`bi ${p.icon} text-warning fs-6`}></i>
              <span className="fw-bold text-white small">{p.title}</span>
            </div>
            <p className="small mb-0" style={{ color: "#d1cdc7", fontSize: "0.76rem", lineHeight: "1.4" }}>
              {p.tip}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSendToChat("Give me 3 creative posing cues for an upcoming graduation portrait.")}
        className="btn btn-warning w-100 rounded-pill py-2 text-dark fw-bold small d-flex align-items-center justify-content-center gap-2 flex-shrink-0 mt-auto shadow-sm"
      >
        <i className="bi bi-magic"></i>
        <span>Ask AI for Creative Posing Ideas</span>
      </button>
    </div>
  );
}

function PhotographerChecklistScreen() {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checklist = [
    { id: "c1", category: "Camera Bodies", text: "Primary & backup cameras with fresh batteries & formatted SD cards" },
    { id: "c2", category: "Lenses", text: "Portrait primes (85mm/50mm) & versatile zoom (24-70mm f/2.8)" },
    { id: "c3", category: "Lighting", text: "Wireless triggers, test flash sync, clean softbox diffusers" },
    { id: "c4", category: "Studio Bay Prep", text: "Backdrop swept clean, posing stools sanitized & positioned" },
    { id: "c5", category: "Styling Kit", text: "Lint roller, clips, safety pins, hair ties, microfiber cloths" },
  ];

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {checklist.map((item) => {
          const isDone = !!checkedItems[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className="ai-action-card mb-2 cursor-pointer flex-row align-items-center justify-content-between"
              style={{ padding: "0.75rem 0.95rem" }}
            >
              <div className="d-flex align-items-center gap-2.5">
                <i className={`bi ${isDone ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary'} fs-5`}></i>
                <div>
                  <div className="badge bg-secondary-subtle text-light small py-0 px-1.5 mb-1" style={{ fontSize: "0.62rem" }}>
                    {item.category}
                  </div>
                  <p className={`small mb-0 ${isDone ? 'text-secondary text-decoration-line-through' : 'text-white'}`} style={{ fontSize: "0.76rem" }}>
                    {item.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Public Preset Screens ─────────────────────────────────────────────────────

function MatchScreen() {
  const [chosen, setChosen] = useState(null);
  const rec = chosen ? PACKAGE_MATCH[chosen] : null;

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <p className="small my-1 flex-shrink-0" style={{ color: "#d1cdc7", fontSize: "0.76rem" }}>
        Select your shoot occasion to find the recommended package:
      </p>

      <div className="row g-2 mb-2 flex-shrink-0">
        {Object.keys(PACKAGE_MATCH).map((key) => {
          const isSelected = chosen === key;
          const pkg = PACKAGE_MATCH[key];
          return (
            <div key={key} className="col-6">
              <button
                onClick={() => setChosen(key)}
                className={`btn btn-sm w-100 py-2 d-flex align-items-center gap-2 rounded-3 text-start ${
                  isSelected
                    ? "btn-warning text-dark fw-bold border-warning shadow-sm"
                    : "btn-outline-light text-light"
                }`}
                style={{ fontSize: "0.75rem" }}
              >
                <i className={`bi ${pkg.icon}`}></i>
                <span className="text-capitalize text-truncate">{key.replace("-", " ")}</span>
              </button>
            </div>
          );
        })}
      </div>

      {rec && (
        <div className="ai-action-card border-warning bg-warning-subtle p-3 mt-auto flex-shrink-0">
          <div className="d-flex align-items-center justify-content-between w-100 mb-1">
            <span className="badge bg-warning text-dark fw-bold text-uppercase" style={{ fontSize: "0.62rem" }}>
              Best Match Found
            </span>
            <span className="fw-bold text-warning small">{rec.price}</span>
          </div>
          <p className="fw-bold text-white small mb-1">{rec.name}</p>
          <p className="small mb-2" style={{ color: "#d1cdc7", fontSize: "0.73rem" }}>
            Includes high-definition edited digital files & professional studio lighting.
          </p>
          <Link
            to={rec.link}
            className="btn btn-warning w-100 py-1.5 rounded-pill text-dark fw-bold small d-flex align-items-center justify-content-center gap-1"
            style={{ fontSize: "0.78rem" }}
          >
            <span>View Package Details</span>
            <i className="bi bi-arrow-right"></i>
          </Link>
        </div>
      )}
    </div>
  );
}

function PricingScreen() {
  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {PRICING_INFO.map((row) => (
          <div key={row.type} className="ai-action-card mb-2" style={{ padding: "0.7rem 0.95rem" }}>
            <div className="d-flex align-items-center justify-content-between w-100 mb-0.5">
              <span className="fw-bold text-white small">{row.type}</span>
              <span className="badge bg-secondary-subtle text-light small py-0.5 px-1.5" style={{ fontSize: "0.62rem" }}>
                {row.badge}
              </span>
            </div>
            <span className="text-warning small" style={{ fontSize: "0.76rem" }}>
              {row.note}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-top border-secondary-subtle mt-auto flex-shrink-0">
        <p className="small mb-2" style={{ color: "#b8b3ab", fontSize: "0.7rem" }}>
          * 50% non-refundable down payment is required to confirm booking slot.
        </p>
        <Link
          to={siteConfig.routes.services}
          className="btn btn-warning w-100 rounded-pill py-2 text-dark fw-bold small d-flex align-items-center justify-content-center gap-1 shadow-sm"
        >
          <span>Browse Full Package Catalog</span>
          <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
    </div>
  );
}

function PrepScreen() {
  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {PREP_TIPS.map((tip) => (
          <div key={tip.title} className="ai-action-card mb-2" style={{ padding: "0.75rem 0.95rem" }}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className={`bi ${tip.icon} text-warning fs-6`}></i>
              <span className="fw-bold text-white small">{tip.title}</span>
            </div>
            <p className="small mb-0" style={{ color: "#d1cdc7", fontSize: "0.76rem", lineHeight: "1.45" }}>
              {tip.tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQScreen() {
  const [open, setOpen] = useState(0);

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {FAQS.map((item, i) => (
          <div key={i} className="ai-accordion-card">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="ai-accordion-trigger"
            >
              <span className="pe-2">{item.q}</span>
              <i
                className={`bi bi-chevron-down text-warning transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                style={{ fontSize: "0.75rem" }}
              ></i>
            </button>
            {open === i && (
              <div className="ai-accordion-content animate-fade-in">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Screen Metadata for Universal Header ─────────────────────────────────────

const SCREEN_META = {
  chat: { title: "AI Studio Chat", subtitle: "Active Conversation" },
  drafts: { title: "Message Templates", subtitle: "1-Click SMS & Email" },
  dispatch: { title: "Photographer Dispatch", subtitle: "Assignment Matrix" },
  policy: { title: "Studio Policies", subtitle: "Standard Operations" },
  posing: { title: "Posing Master Guide", subtitle: "Lighting & Angles" },
  checklist: { title: "Gear Checklist", subtitle: "Pre-Shoot Inspection" },
  match: { title: "Package Matcher", subtitle: "Tailored Selection" },
  pricing: { title: "Package Rates", subtitle: "2026 Studio Rates" },
  prep: { title: "Shoot Prep Tips", subtitle: "Wardrobe & Arrival" },
  faq: { title: "Booking FAQs", subtitle: "Helpful Answers" },
};

// ── Main AIAssistant Component ────────────────────────────────────────────────

export default function AIAssistant() {
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState("chat");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const panelRef = useRef(null);
  const resetChatRef = useRef(null);

  // Determine active portal based on URL pathname
  const portal = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/photographer")) return "photographer";
    if (p.startsWith("/dashboard")) return "dashboard";
    return "public";
  }, [location.pathname]);

  const config = PORTAL_CONFIGS[portal] || PORTAL_CONFIGS.public;

  // Listen for programmatic open events (e.g. from AdminHeader or buttons)
  useEffect(() => {
    const handleCustomOpen = (e) => {
      setIsOpen(true);
      if (e.detail?.screen) {
        setScreen(e.detail.screen);
      }
      if (e.detail?.prompt) {
        setPendingPrompt(e.detail.prompt);
      }
    };
    window.addEventListener("open-ai-assistant", handleCustomOpen);
    return () => window.removeEventListener("open-ai-assistant", handleCustomOpen);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const handleOpenToChat = (prompt = "") => {
    setPendingPrompt(prompt);
    setScreen("chat");
    setIsOpen(true);
  };

  const handleResetChatClick = () => {
    if (resetChatRef.current) {
      resetChatRef.current();
    }
  };

  return (
    <div
      ref={panelRef}
      className="ai-assistant-wrapper"
      aria-label="AI Studio Assistant"
    >
      {/* ── Single Unified Chat Modal Window ─────────────────────────────────── */}
      {isOpen && (
        <div
          className="ai-modal-card shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          {/* Universal Single Header */}
          <div className="ai-modal-header">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              {screen !== "home" && (
                <button
                  onClick={() => setScreen("home")}
                  className="ai-header-btn me-0.5"
                  title="Back to menu"
                  aria-label="Back to menu"
                >
                  <i className="bi bi-arrow-left"></i>
                </button>
              )}
              <div className="ai-brand-badge flex-shrink-0">
                <i className="bi bi-stars"></i>
              </div>
              <div className="text-truncate">
                <h4 className="ai-header-title text-truncate">
                  {screen === "home" ? config.title : (SCREEN_META[screen]?.title || config.title)}
                </h4>
                <div className="d-flex align-items-center gap-1.5 mt-0.5">
                  <span className="ai-dot-online"></span>
                  <span className="ai-status-subtitle text-truncate">
                    {screen === "home" ? `Online · ${config.roleLabel}` : (SCREEN_META[screen]?.subtitle || "Active")}
                  </span>
                </div>
              </div>
            </div>

            <div className="ai-header-actions flex-shrink-0">
              {screen === "chat" && (
                <button
                  onClick={handleResetChatClick}
                  className="ai-header-btn"
                  title="Clear chat history"
                  aria-label="Clear chat history"
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ai-header-btn"
                aria-label="Close assistant"
                title="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          {/* Strictly Bounded Modal Content Viewport */}
          <div className="ai-modal-body">
            {screen === "home" && (
              <div className="ai-home-container animate-fade-in">
                <div className="mb-2.5 flex-shrink-0">
                  <h5 className="text-white fw-bold mb-1" style={{ fontSize: "1rem" }}>
                    {config.greeting}
                  </h5>
                  <p className="small mb-0" style={{ color: "#d1cdc7", fontSize: "0.8rem", lineHeight: "1.45" }}>
                    {config.description}
                  </p>
                </div>

                {/* High-Contrast Quick Action Cards */}
                <div className="row g-2 flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
                  {config.quickActions.map((action) => (
                    <div key={action.id} className="col-6">
                      <button
                        onClick={() => setScreen(action.id)}
                        className="ai-action-card h-100"
                      >
                        <div className="ai-action-card-icon" style={{ background: action.iconBg, color: action.iconColor }}>
                          <i className={`bi ${action.icon}`}></i>
                        </div>
                        <span className="ai-action-card-title">
                          {action.label}
                        </span>
                        <span className="ai-action-card-subtitle">
                          {action.desc}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Primary CTA */}
                <button
                  onClick={() => setScreen("chat")}
                  className="btn btn-warning w-100 rounded-pill py-2.5 text-dark fw-bold small d-flex align-items-center justify-content-center gap-2 shadow-sm flex-shrink-0 mt-2"
                >
                  <i className="bi bi-chat-dots-fill"></i>
                  <span>Start AI Quick Chat</span>
                </button>
              </div>
            )}

            {screen === "chat" && (
              <ChatScreen
                portal={portal}
                initialPrompt={pendingPrompt}
                onResetChatRef={resetChatRef}
              />
            )}

            {/* Admin Dedicated Screens */}
            {screen === "drafts" && (
              <AdminDraftsScreen onSendToChat={handleOpenToChat} />
            )}
            {screen === "dispatch" && (
              <AdminDispatchGuideScreen onSendToChat={handleOpenToChat} />
            )}
            {screen === "policy" && (
              <AdminPolicyScreen />
            )}

            {/* Photographer Dedicated Screens */}
            {screen === "posing" && (
              <PhotographerPosingScreen onSendToChat={handleOpenToChat} />
            )}
            {screen === "checklist" && (
              <PhotographerChecklistScreen />
            )}

            {/* Public Screens */}
            {screen === "match" && <MatchScreen />}
            {screen === "pricing" && <PricingScreen />}
            {screen === "prep" && <PrepScreen />}
            {screen === "faq" && <FAQScreen />}
          </div>
        </div>
      )}

      {/* ── Floating Trigger Button (Bootstrap Styled) ────────────────────── */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : () => { setScreen("chat"); setIsOpen(true); }}
        className={`ai-launcher-btn ${isOpen ? 'is-active' : ''}`}
        aria-label="Toggle AI Assistant"
        title={isOpen ? "Close AI Assistant" : "Chat with Koda AI"}
      >
        <span className="ai-launcher-tooltip">
          <i className="bi bi-stars me-1 text-warning"></i>
          <span>{config.roleLabel}</span>
        </span>
        {!isOpen && <span className="ai-launcher-pulse" />}
        {isOpen ? (
          <i className="bi bi-x-lg fs-5"></i>
        ) : (
          <i className="bi bi-stars fs-4"></i>
        )}
      </button>
    </div>
  );
}
