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
import { motion } from "framer-motion";
import {
  viewport,
  stagger,
  staggerChild,
  ease,
} from "../../lib/motion";
import SectionHeader from "../ui/SectionHeader";

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <motion.div
      variants={staggerChild}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`border rounded-xl overflow-hidden transition-[border-color,box-shadow] duration-300 ${
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
        <motion.span
          animate={{ scale: isOpen ? 1.15 : 1, rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 16 }}
          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${
            isOpen ? "bg-gold text-primary" : "bg-neutral-100 text-neutral-500"
          }`}
          aria-hidden="true"
        >
          {isOpen
            ? <Minus size={14} strokeWidth={2.5} />
            : <Plus size={14} strokeWidth={2.5} />
          }
        </motion.span>
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
          <motion.div
            className="w-8 h-px bg-gold/40 mb-3 origin-left"
            initial={false}
            animate={{ scaleX: isOpen ? 1 : 0.3 }}
            transition={{ duration: 0.5, ease: ease.expo }}
            aria-hidden="true"
          />
          <p className="font-body text-neutral-500 text-sm leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ServiceFAQ({ faqs, topics, title = "Frequently Asked Questions", subtitle }) {
  const [openId, setOpenId]       = useState(null);
  const [activeTopic, setActiveTopic] = useState("all");

  const allTopics = [{ id: "all", label: "All Questions" }, ...(topics || [])];

  const filtered = activeTopic === "all"
    ? faqs
    : faqs.filter((f) => f.topic === activeTopic);

  return (
    <section className="section-padding bg-neutral-50" aria-labelledby="faq-heading">
      <div className="container-custom max-w-4xl">

        {/* Header */}
        <SectionHeader
          eyebrow="FAQ"
          title={title}
          subtitle={subtitle || "Everything you need to know before booking your session."}
          id="faq-heading"
        />

        {/* Topic Filter Tabs */}
        <motion.div
          className="flex flex-wrap gap-2 justify-center mb-10"
          role="tablist"
          aria-label="FAQ topics"
          variants={stagger(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          {allTopics.map((topic) => (
            <motion.button
              key={topic.id}
              role="tab"
              aria-selected={activeTopic === topic.id}
              onClick={() => {
                setActiveTopic(topic.id);
                setOpenId(null);
              }}
              variants={staggerChild}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 py-2 rounded-full text-xs font-body font-medium uppercase tracking-wider transition-[background-color,color,box-shadow,border-color] duration-200 ${
                activeTopic === topic.id
                  ? "bg-primary text-white shadow-warm-sm"
                  : "bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-primary"
              }`}
            >
              {topic.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Accordion */}
        <motion.div
          className="space-y-3"
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          key={activeTopic}
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
        </motion.div>
      </div>
    </section>
  );
}
