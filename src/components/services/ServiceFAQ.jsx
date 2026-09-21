/**
 * ServiceFAQ.jsx
 * ==============
 * ACCORDION FAQ COMPONENT
 *
 * Displays questions grouped by topic.
 * Each question expands/collapses on click.
 * Keyboard accessible — Enter/Space toggles open state.
 *
 * Props:
 *  @param {array}  faqs      - Array of FAQ objects from faqData.js
 *  @param {array}  topics    - Array of topic filter objects
 *  @param {string} title     - Section title
 *  @param {string} subtitle  - Section subtitle
 */

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";
import SectionHeader from "../ui/SectionHeader";

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-300 ${
        isOpen
          ? "border-gold/40 shadow-warm-sm"
          : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      {/* Question button */}
      <button
        id={`faq-btn-${faq.id}`}
        className="w-full flex items-start justify-between gap-4 p-5 text-left bg-surface"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${faq.id}`}
      >
        <span className="font-heading text-primary text-base font-medium leading-snug">
          {faq.question}
        </span>
        <span
          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${
            isOpen ? "bg-gold text-primary" : "bg-neutral-100 text-neutral-500"
          }`}
          aria-hidden="true"
        >
          {isOpen
            ? <Minus size={14} strokeWidth={2.5} />
            : <Plus size={14} strokeWidth={2.5} />
          }
        </span>
      </button>

      {/* Answer panel */}
      <div
        id={`faq-panel-${faq.id}`}
        role="region"
        aria-labelledby={`faq-btn-${faq.id}`}
        className={`overflow-hidden transition-all duration-400 ease-smooth ${
          isOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="px-5 pb-5 pt-1">
          <div className="w-8 h-px bg-gold/40 mb-3" aria-hidden="true" />
          <p className="font-body text-neutral-500 text-sm leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ServiceFAQ({ faqs, topics, title = "Frequently Asked Questions", subtitle }) {
  const [openId, setOpenId]       = useState(null);
  const [activeTopic, setActiveTopic] = useState("all");

  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: bodyRef, inView: bodyIn } = useScrollReveal({ threshold: 0.05 });

  const allTopics = [{ id: "all", label: "All Questions" }, ...(topics || [])];

  const filtered = activeTopic === "all"
    ? faqs
    : faqs.filter((f) => f.topic === activeTopic);

  return (
    <section className="section-padding bg-neutral-50" aria-labelledby="faq-heading">
      <div className="container-custom max-w-4xl">

        {/* Header */}
        <div
          ref={headRef}
          className={`transition-all duration-700 ease-smooth ${
            headIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <SectionHeader
            eyebrow="FAQ"
            title={title}
            subtitle={subtitle || "Everything you need to know before booking your session."}
            id="faq-heading"
          />
        </div>

        {/* Topic Filter Tabs */}
        <div
          className="flex flex-wrap gap-2 justify-center mb-10"
          role="tablist"
          aria-label="FAQ topics"
        >
          {allTopics.map((topic) => (
            <button
              key={topic.id}
              role="tab"
              aria-selected={activeTopic === topic.id}
              onClick={() => {
                setActiveTopic(topic.id);
                setOpenId(null);
              }}
              className={`px-4 py-2 rounded-full text-xs font-body font-medium uppercase tracking-wider transition-all duration-200 ${
                activeTopic === topic.id
                  ? "bg-primary text-white shadow-warm-sm"
                  : "bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-primary"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>

        {/* Accordion */}
        <div
          ref={bodyRef}
          className={`space-y-3 transition-all duration-700 ease-smooth ${
            bodyIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {filtered.map((faq) => (
            <AccordionItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center font-body text-neutral-400 py-8">
              No questions in this topic yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
