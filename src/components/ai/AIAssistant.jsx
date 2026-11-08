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
 *  - Powered by Groq AI Engine (qwen/qwen3.8-27b) with Gemini Fallback
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { siteConfig } from "../../config/siteConfig";
import { getServices, getFaqs } from "../../services/contentService";
import { getAiClient, isAiConfigured, getActiveAiProvider } from "../../lib/ai";
import { shortServiceLabel } from "../../lib/sectionNav";
import "./AIAssistant.bootstrap.css";

const aiClient = getAiClient();

/** Conversation caps: total messages kept, and how much history the model sees. */
const MAX_MESSAGES = 30;
const HISTORY_WINDOW = 12;

/** Clipboard with a fallback for browsers/contexts without the async API. */
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Per-category icon for the live package lists. */
const CATEGORY_ICONS = {
  college: "bi-mortarboard",
  "senior-high": "bi-person-badge",
};

const iconForService = (service) =>
  CATEGORY_ICONS[service?.category] || "bi-camera2";

/** Lowest tier price of a package, or null when nothing parses. */
function fromPriceOf(service) {
  const prices = (service?.tiers || [])
    .map((t) => parseFloat(String(t.price || "").replace(/[^\d.]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** "₱4,875.00" -> "₱4,875" so compact cards stay readable. */
function trimPrice(price) {
  const n = parseFloat(String(price || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return price || "";
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

// ── Markdown Formatter with Clean Bullets & Copy ───────────────────────────────

function FormatMessage({ text }) {
  const [copyState, setCopyState] = useState("idle");

  if (!text) return null;

  const handleCopy = async () => {
    const ok = await copyText(text);
    setCopyState(ok ? "ok" : "fail");
    setTimeout(() => setCopyState("idle"), 2000);
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
          className={`ai-bubble-copy-btn ${copyState === "ok" ? "copied" : ""}`}
        >
          <i
            className={
              copyState === "ok"
                ? "bi bi-check2 text-success"
                : copyState === "fail"
                  ? "bi bi-exclamation-circle text-danger"
                  : "bi bi-clipboard"
            }
          ></i>
          <span>
            {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy"}
          </span>
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

/**
 * Live catalog → plain-text context for the model, built from the same
 * services/FAQs the site renders (never a hard-coded price list that can drift).
 */
function buildCatalogContext(services, faqs) {
  const parts = [];

  if (services?.length) {
    const lines = services.map((service) => {
      const tiers = (service.tiers || [])
        .map((tier) => `${tier.name} ${tier.price}`)
        .join(", ");
      return `${shortServiceLabel(service)} [${service.category}] — ${tiers || "no sets listed"}`;
    });
    parts.push(`Live package catalog (name [category] — sets): ${lines.join(" | ")}`);
  }

  if (faqs?.length) {
    const top = faqs
      .slice(0, 12)
      .map((f) => `Q: ${f.question} A: ${f.answer}`)
      .join(" | ");
    parts.push(`FAQs: ${top}`);
  }

  return parts.join("\n").slice(0, 4000);
}

const PREP_TIPS = [
  { title: "What to wear", tip: "Wear solid colors that complement your skin tone. Avoid busy patterns and loud stripes.", icon: "bi bi-palette" },
  { title: "Arrive early", tip: "Plan to arrive 10–15 minutes early so we can review the shoot plan, styling, and lighting.", icon: "bi bi-clock-history" },
  { title: "Bring outfit options", tip: "Bring 2–3 outfit options on hangers to give yourself diverse portrait looks.", icon: "bi bi-bag-check" },
  { title: "Graduation attire", tip: "Bring your official graduation collar/hood, toga cap, and formal white inner shirt/blouse.", icon: "bi bi-mortarboard" },
  { title: "Photo delivery", tip: "Edited photos are delivered within 5–7 business days via your private online client gallery.", icon: "bi bi-cloud-arrow-down" },
];

/** Static fallback when the live FAQ feed returns nothing. */
const STATIC_FAQS = [
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

function ChatScreen({ portal, messages, isTyping, onSend }) {
  const config = PORTAL_CONFIGS[portal] || PORTAL_CONFIGS.public;

  const streamRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const [input, setInput] = useState("");
  const [showJump, setShowJump] = useState(false);

  // Focus the composer when the chat screen opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Follow new replies — but never yank the view while reading older messages.
  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    if (atBottom) {
      endRef.current?.scrollIntoView({ behavior: isTyping ? "auto" : "smooth", block: "end" });
    }
  }, [messages, isTyping]);

  const handleStreamScroll = () => {
    const el = streamRef.current;
    if (!el) return;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight >= 96);
  };

  const scrollToBottom = (behavior = "smooth") => {
    endRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const autoGrow = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 116)}px`;
  };

  const submit = (event) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    onSend(text);
    requestAnimationFrame(() => scrollToBottom());
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Suggestion Chips (Compact Horizontal Carousel) */}
      <div className="ai-chips-scroll">
        {config.quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSend(chip)}
            disabled={isTyping || !aiClient}
            className="ai-chip-pill"
          >
            <i className="bi bi-stars text-warning" style={{ fontSize: "0.68rem" }}></i>
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div
        className="ai-msg-stream"
        ref={streamRef}
        onScroll={handleStreamScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation with Koda AI"
      >
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.notice ? (
              <div className="ai-notice-row">
                <div className="ai-bubble-notice">
                  <i className="bi bi-info-circle me-1"></i>
                  {msg.text}
                </div>
              </div>
            ) : msg.role === "user" ? (
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
              <span className="ai-typing-dots" aria-hidden="true">
                <span></span><span></span><span></span>
              </span>
              <span style={{ color: "#d1cdc7", fontSize: "0.75rem" }}>Koda is thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Jump to latest — only when the user scrolled up */}
      {showJump && (
        <button
          type="button"
          className="ai-jump-latest"
          onClick={() => {
            scrollToBottom();
            setShowJump(false);
          }}
        >
          <i className="bi bi-arrow-down"></i>
          <span>Latest</span>
        </button>
      )}

      {/* Docked Composer */}
      <form onSubmit={submit} className="pt-2 border-top border-secondary-subtle flex-shrink-0 mt-auto">
        <div className="ai-input-wrapper">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={aiClient ? "Message Koda AI…" : "AI key not configured"}
            disabled={!aiClient || isTyping}
            aria-label="Message Koda AI"
            className="ai-input-field ai-input-textarea"
          />
          <button
            type="submit"
            disabled={!aiClient || !input.trim() || isTyping}
            className="ai-input-send-btn"
            title="Send message"
            aria-label="Send message"
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
        <div className="ai-composer-hint">
          {aiClient ? (
            <span>⚡ Ultra-fast Groq AI online · Enter to send</span>
          ) : (
            <span>Studio Assistant online · Enter to send</span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Admin Presets Screen ──────────────────────────────────────────────────────

function AdminDraftsScreen({ onSendToChat }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = async (text, idx) => {
    const ok = await copyText(text);
    if (!ok) return;
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
      title: "Senior High & Academic Milestones",
      target: "Portrait Specialists",
      icon: "bi bi-person-badge-fill",
      color: "text-primary",
      desc: "Fast-paced student posing, uniform gown alignment, rush ID standard framing, and friendly student coaching.",
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

function MatchScreen({ services = [] }) {
  const [chosen, setChosen] = useState(null);

  const rec = chosen ? services.find((s) => s.slug === chosen) : null;
  const recPrice = rec ? fromPriceOf(rec) : null;

  if (!services.length) {
    return (
      <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="ai-action-card p-3">
          <span className="small" style={{ color: "#d1cdc7", fontSize: "0.76rem" }}>
            <i className="bi bi-arrow-repeat me-2"></i>
            Loading live packages…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <p className="small my-1 flex-shrink-0" style={{ color: "#d1cdc7", fontSize: "0.76rem" }}>
        Select what you're shooting to find the recommended package:
      </p>

      <div className="row g-2 mb-2 flex-shrink-0">
        {services.map((service) => {
          const slug = service.slug;
          const isSelected = chosen === slug;
          return (
            <div key={slug} className="col-6">
              <button
                onClick={() => setChosen(slug)}
                title={shortServiceLabel(service)}
                className={`btn btn-sm w-100 py-2 d-flex align-items-center gap-2 rounded-3 text-start ${
                  isSelected
                    ? "btn-warning text-dark fw-bold border-warning shadow-sm"
                    : "btn-outline-light text-light"
                }`}
                style={{ fontSize: "0.75rem" }}
              >
                <i className={`bi ${iconForService(service)} flex-shrink-0`}></i>
                <span className="text-truncate">{shortServiceLabel(service)}</span>
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
            {recPrice != null && (
              <span className="fw-bold text-warning small">from {trimPrice(recPrice)}</span>
            )}
          </div>
          <p className="fw-bold text-white small mb-1">{shortServiceLabel(rec)}</p>
          {rec.tagline && (
            <p className="small mb-2" style={{ color: "#d1cdc7", fontSize: "0.73rem" }}>
              {rec.tagline}
            </p>
          )}
          <Link
            to={`${siteConfig.routes.services}#sets-${rec.slug}`}
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

function PricingScreen({ services = [] }) {
  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {services.length ? (
          services.map((service) => {
            const tiers = service.tiers || [];
            const from = fromPriceOf(service);
            return (
              <div key={service.slug} className="ai-action-card mb-2" style={{ padding: "0.7rem 0.95rem" }}>
                <div className="d-flex align-items-center justify-content-between w-100 mb-0.5">
                  <span className="fw-bold text-white small">{shortServiceLabel(service)}</span>
                  <span
                    className="badge bg-secondary-subtle text-light small py-0.5 px-1.5 text-capitalize"
                    style={{ fontSize: "0.62rem" }}
                  >
                    {String(service.category || "").replace(/-/g, " ")}
                  </span>
                </div>
                <span className="text-warning small" style={{ fontSize: "0.76rem" }}>
                  {tiers.length
                    ? tiers.map((t) => `${t.name}: ${t.price}`).join(" · ")
                    : "Rates available on request"}
                </span>
                {from != null && (
                  <div className="mt-1">
                    <span className="badge bg-dark border border-secondary text-light" style={{ fontSize: "0.6rem" }}>
                      from {trimPrice(from)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="ai-action-card p-3">
            <span className="small" style={{ color: "#d1cdc7", fontSize: "0.76rem" }}>
              <i className="bi bi-arrow-repeat me-2"></i>
              Loading live rates…
            </span>
          </div>
        )}
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

function FAQScreen({ faqs = [] }) {
  const [open, setOpen] = useState(0);

  const items = useMemo(() => {
    const live = (faqs || [])
      .filter((f) => {
        const topic = String(f.topic || f.category || "").toLowerCase();
        return !topic || ["booking", "pricing", "delivery"].includes(topic);
      })
      .slice(0, 10)
      .map((f) => ({ q: f.question, a: f.answer }));
    return live.length ? live : STATIC_FAQS;
  }, [faqs]);

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-grow-1 overflow-y-auto pe-1 my-1" style={{ minHeight: 0, scrollbarWidth: "thin" }}>
        {items.map((item, i) => (
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

// ── Conversation Bootstrap & Model Instructions ───────────────────────────────

function initialMessages(portal) {
  const config = PORTAL_CONFIGS[portal] || PORTAL_CONFIGS.public;
  const tail =
    portal === "admin"
      ? " Ask me to draft client messages, check booking rules, or give photographer dispatch advice."
      : " Ask me anything about our packages, shoot preparation, or studio services!";

  const list = [{ role: "model", text: config.greeting + tail }];

  if (!isAiConfigured()) {
    list.push({
      role: "model",
      notice: true,
      text: "Live AI engine is in offline mode. The interactive catalog, packages, shoot prep, and FAQ tools are fully active.",
    });
  }
  return list;
}

function buildSystemInstruction(portal, catalog) {
  const context = buildCatalogContext(catalog.services, catalog.faqs);

  if (portal === "admin") {
    return `You are Koda Admin Co-Pilot, the specialized AI operations assistant for E-Kodak Photography Studio staff and administrators.
You assist with:
1. Drafting polite, professional, and clear SMS or email templates for customers (down payment reminders, call times, venue directions, photos ready notices).
2. Photographer Dispatch: Explaining photographer matching (Studio/Barong/Toga -> Portrait specialists; Campus Cohorts -> Batch pictorial specialists; Commercial -> Lighting/Product specialists).
3. Lifecycle & Workflow Rules:
   - Status Flow: PENDING -> CONFIRMED -> PHOTOGRAPHER_ASSIGNED -> CAPTURE -> EDITING -> PRINTING -> READY -> COMPLETED.
   - Financial Policy: 50% non-refundable down payment required to confirm. Remaining balance due on shoot day.
   - Reassignment: Bookings can be reassigned or unassigned back to CONFIRMED.
4. Keep answers sharp, structured, actionable, and formatted with clean bullet points and bold highlights.
Context:
${context}`;
  }

  if (portal === "photographer") {
    return `You are Koda Photographer Field Assistant for E-Kodak studio photographers.
You help photographers on shoot day with:
1. Posing & Lighting: Guidance on toga/barong graduation poses, formal corporate portraits, and family grouping.
2. Equipment & Prep: Pre-shoot checklists (lenses, lighting triggers, memory cards).
3. Session Workflow: Progressing status to CAPTURE during shoot, then EDITING, then READY.
Keep advice practical, encouraging, and professional.
Context:
${context}`;
  }

  if (portal === "dashboard") {
    return `You are Koda Client Concierge for booked E-Kodak customers.
You guide customers with their existing bookings:
- What to bring on shoot day (wardrobe, graduation collars).
- Remaining balance payment policies (due on shoot day).
- Turnaround time for photo outputs (5-7 business days).
Be warm, reassuring, and concise.
Context:
${context}`;
  }

  return `You are Koda, E-Kodak Photography Studio's friendly AI concierge for prospective clients.
You help clients choose packages, compare sets, explain pricing, and guide them to book.
Core products: College graduation packages and Senior High school packages.
Always quote set prices from the live catalog in the context below — never invent amounts.
Payment rule: 50% down payment required to confirm; remaining balance due on shoot day.
Context:
${context}`;
}

// ── Intelligent Studio Concierge Knowledge Fallback Engine ───────────────────
function getStudioConciergeResponse(query, portal, catalog) {
  const q = (query || "").toLowerCase();
  const services = catalog?.services || [];
  const faqs = catalog?.faqs || [];

  // 1. FAQ exact/keyword matching
  const matchedFaq = faqs.find((f) => {
    const qLower = (f.question || "").toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    const matches = words.filter((w) => qLower.includes(w));
    return matches.length >= 2 || qLower.includes(q);
  });
  if (matchedFaq && matchedFaq.answer) {
    return `**${matchedFaq.question}**\n\n${matchedFaq.answer}`;
  }

  // 2. Package rates, pricing, sets
  if (
    q.includes("rate") ||
    q.includes("price") ||
    q.includes("package") ||
    q.includes("cost") ||
    q.includes("how much") ||
    q.includes("tier")
  ) {
    if (services.length > 0) {
      let reply = `Here are our official studio photography packages:\n\n`;
      services.forEach((s) => {
        reply += `• **${s.name}**: Starting from ₱${Number(s.base_price || 0).toLocaleString()}\n`;
        if (s.tiers && s.tiers.length > 0) {
          s.tiers.forEach((t) => {
            reply += `   - ${t.name}: ₱${Number(t.price || 0).toLocaleString()}\n`;
          });
        }
      });
      reply += `\n*A 50% downpayment confirms your session schedule. The remaining balance is settled on your shoot day.*`;
      return reply;
    }
    return `Our signature offerings include **College Graduation Packages** and **Senior High Sets** starting from ₱795. A 50% reservation downpayment secures your date.`;
  }

  // 3. Downpayment, payment methods, settlement
  if (
    q.includes("payment") ||
    q.includes("deposit") ||
    q.includes("downpayment") ||
    q.includes("balance") ||
    q.includes("pay") ||
    q.includes("gcash")
  ) {
    return `**E-Kodak Studio Payment Policy**\n\n• **50% Downpayment:** Required upon booking to reserve your photographer and studio bay.\n• **Remaining Balance:** Settle anytime before or directly during your shoot day at the studio.\n• **Accepted Channels:** GCash, Online Bank Transfer (BDO / BPI), or Cash at our studio counter.`;
  }

  // 4. Wardrobe, what to bring, attire, toga
  if (
    q.includes("bring") ||
    q.includes("wear") ||
    q.includes("attire") ||
    q.includes("toga") ||
    q.includes("clothes") ||
    q.includes("prep") ||
    q.includes("dress")
  ) {
    return `**Shoot Preparation & Wardrobe Guidelines**\n\n• **Graduation Shoots:** Bring your school-prescribed collared shirt or white button-down. Studio togas, academic hoods, and caps across standard sizes are steam-sanitized in the dressing rooms.\n• **Grooming:** Arrive with clean, moisturized skin. Dedicated vanity stations with studio mirrors and touch-up tables are ready for you.\n• **Arrival:** Please arrive 15 minutes before your booked bay schedule for seamless fitting.`;
  }

  // 5. Deliverables, photo outputs, claiming, proofs
  if (
    q.includes("photo") ||
    q.includes("deliver") ||
    q.includes("copy") ||
    q.includes("proof") ||
    q.includes("when") ||
    q.includes("ready") ||
    q.includes("claim")
  ) {
    return `**Photo Outputs & Claiming Timeline**\n\n• **Digital Proofing:** Available in your Client Portal within 2–3 business days post-photoshoot.\n• **Master Prints & Framed Outputs:** Completed within 5–7 business days.\n• **Fulfillment Modes:** Claim at our studio reception or select Studio Direct Delivery to your address.`;
  }

  // 6. Location, studio hours, address
  if (
    q.includes("location") ||
    q.includes("where") ||
    q.includes("address") ||
    q.includes("hour") ||
    q.includes("open") ||
    q.includes("contact") ||
    q.includes("phone")
  ) {
    return `**E-Kodak Studio Details**\n\n📍 **Location:** Colon Heritage Bldg, Colon Street, Cebu City\n⏰ **Operating Hours:** Monday–Saturday, 8:00 AM – 5:00 PM PHT (Closed Sundays)\n📞 **Studio Phone:** (032) 412-8921 / 0910-294-9414`;
  }

  // 7. Rescheduling policy
  if (q.includes("reschedule") || q.includes("cancel") || q.includes("change date") || q.includes("change time")) {
    return `**Studio Rescheduling Policy**\n\n• You may request rescheduling directly from your **Booking Records** dashboard at least **48 hours prior** to your appointment.\n• Your 50% reservation deposit automatically transfers to your newly selected schedule without penalty.`;
  }

  // 8. General friendly concierge guidance
  return `Hello! I'm Koda, your E-Kodak Studio concierge. I can guide you through:\n\n• **Package rates & tier inclusions**\n• **50% reservation downpayment & payment channels**\n• **Wardrobe fitting & shoot preparation**\n• **Photo deliverables & studio claiming**\n\nFeel free to ask any specific studio question!`;
}

// ── Main AIAssistant Component ────────────────────────────────────────────────

export default function AIAssistant() {
  const location = useLocation();

  // Determine active portal based on URL pathname
  const portal = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/photographer")) return "photographer";
    if (p.startsWith("/dashboard")) return "dashboard";
    return "public";
  }, [location.pathname]);

  // Open state lives above the portal-keyed panel so the assistant stays open
  // across portal switches; the panel remounts with a fresh conversation.
  const [isOpen, setIsOpen] = useState(false);

  return <AIAssistantPanel key={portal} portal={portal} isOpen={isOpen} setIsOpen={setIsOpen} />;
}

function AIAssistantPanel({ portal, isOpen, setIsOpen }) {
  const config = PORTAL_CONFIGS[portal] || PORTAL_CONFIGS.public;

  const [screen, setScreen] = useState("chat");
  const [messages, setMessages] = useState(() => initialMessages(portal));
  const [isTyping, setIsTyping] = useState(false);
  const [hasActivity, setHasActivity] = useState(false);
  const [catalog, setCatalog] = useState({ services: [], faqs: [] });
  const panelRef = useRef(null);
  // Bumped whenever the conversation is discarded (reset / portal switch) so
  // in-flight replies from the previous conversation are dropped.
  const epochRef = useRef(0);

  // Live catalog + FAQs power the matcher, rates, FAQ screen and model context.
  useEffect(() => {
    let alive = true;
    Promise.all([getServices(), getFaqs()])
      .then(([svcRes, faqRes]) => {
        if (!alive) return;
        setCatalog({ services: svcRes.data || [], faqs: faqRes.data || [] });
      })
      .catch((err) => console.error("AI context load failed:", err));
    return () => {
      alive = false;
    };
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
  }, [isOpen, setIsOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [setIsOpen]);

  const sendMessage = useCallback(async (rawText) => {
    const text = (rawText || "").trim();
    if (!text || isTyping) return;

    if (messages.length >= MAX_MESSAGES) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          notice: true,
          text: "That's the end of this conversation. Use ↺ in the header to start a fresh one.",
        },
      ]);
      return;
    }

    const epoch = epochRef.current;
    setHasActivity(true);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsTyping(true);

    try {
      const history = messages
        .filter((m) => !m.notice)
        .slice(-HISTORY_WINDOW)
        .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

      let replyText = null;

      // 1. Query the studio AI engine (prioritizes Groq, falls back to Gemini)
      if (aiClient) {
        try {
          const response = await aiClient.models.generateContent({
            contents: [...history, { role: "user", parts: [{ text }] }],
            config: {
              systemInstruction: buildSystemInstruction(portal, catalog),
              temperature: 0.6,
              maxTokens: 850,
            },
          });
          if (response?.text) {
            replyText = response.text;
          }
        } catch (apiErr) {
          console.warn("[AIAssistant] Studio AI engine error:", apiErr?.message || apiErr);
        }
      }

      // 2. If AI engine was unavailable or errored, seamlessly provide Studio Concierge Answer
      if (!replyText) {
        replyText = getStudioConciergeResponse(text, portal, catalog);
      }

      if (epoch !== epochRef.current) return;
      setMessages((prev) => [...prev, { role: "model", text: replyText }]);
    } catch (error) {
      console.warn("AI Assistant Fallback:", error);
      if (epoch !== epochRef.current) return;
      const fallback = getStudioConciergeResponse(text, portal, catalog);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: fallback,
        },
      ]);
    } finally {
      if (epoch === epochRef.current) setIsTyping(false);
    }
  }, [messages, isTyping, portal, catalog]);

  // Listen for programmatic open events (e.g. from OrderSummarySidebar)
  useEffect(() => {
    const handleCustomOpen = (e) => {
      setIsOpen(true);
      if (e.detail?.screen) {
        setScreen(e.detail.screen);
      }
      if (e.detail?.prompt) {
        sendMessage(e.detail.prompt);
      }
    };
    window.addEventListener("open-ai-assistant", handleCustomOpen);
    return () => window.removeEventListener("open-ai-assistant", handleCustomOpen);
  }, [sendMessage, setIsOpen]);

  const resetChat = () => {
    epochRef.current += 1;
    setMessages(initialMessages(portal));
    setHasActivity(false);
    setIsTyping(false);
  };

  const handleOpenToChat = (prompt = "") => {
    setScreen("chat");
    setIsOpen(true);
    if (prompt) sendMessage(prompt);
  };

  const handleLauncher = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setScreen(hasActivity ? "chat" : "home");
    setIsOpen(true);
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
          aria-labelledby="ai-dialog-title"
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
              <button
                type="button"
                onClick={() => setScreen("home")}
                className="ai-brand-badge flex-shrink-0"
                title="Menu"
                aria-label="Go to menu"
              >
                <i className="bi bi-stars"></i>
              </button>
              <div className="text-truncate">
                <h4 id="ai-dialog-title" className="ai-header-title text-truncate">
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
                  onClick={resetChat}
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
                messages={messages}
                isTyping={isTyping}
                onSend={sendMessage}
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
            {screen === "match" && <MatchScreen services={catalog.services} />}
            {screen === "pricing" && <PricingScreen services={catalog.services} />}
            {screen === "prep" && <PrepScreen />}
            {screen === "faq" && <FAQScreen faqs={catalog.faqs} />}
          </div>
        </div>
      )}

      {/* ── Floating Trigger Button (Bootstrap Styled) ────────────────────── */}
      <button
        onClick={handleLauncher}
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
