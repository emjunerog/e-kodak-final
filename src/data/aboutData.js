/**
 * aboutData.js
 * ============
 * STUDIO STORY, TEAM, VALUES & TIMELINE
 *
 * HOW TO EDIT:
 *  - Update studio story, mission, vision HERE.
 *  - Add/edit team members in the TEAM array.
 *  - Add milestones to the TIMELINE array.
 *
 * FUTURE — SUPABASE INTEGRATION:
 *  Team profiles and studio content can be managed through the
 *  admin dashboard and stored in a `studio_content` or `team_members` table.
 *
 * NOTE: Team photos are Unsplash placeholders.
 *  Replace with real team photos before launch.
 *  Initials fallback is used if photo fails to load.
 */

// ─── STUDIO STORY ────────────────────────────────────────────────────────────
export const STUDIO_STORY = {
  headline: "Born from a passion for genuine moments.",
  paragraphs: [
    "E-Kodak started not as a business, but as a belief — that every person deserves photography that actually looks like them. Not over-processed, not posed beyond recognition. Just honest, beautiful, meaningful images.",
    "Founded in Cebu, we began with a single camera and a determination to do photography differently. We wanted every client to feel comfortable, confident, and genuinely seen — not like they were rushing through a template photoshoot.",
    "Today, E-Kodak serves hundreds of clients across portraits, graduations, events, and families. But the core principle hasn't changed: every session is personal, every edit is intentional, and every photo we deliver is something you'll be proud to display.",
  ],
  image: "https://images.unsplash.com/photo-1554941829-202a0b2403b8?w=900&q=80&auto=format&fit=crop",
  imageAlt: "Photographer at work in a studio",
  founded: "2021",
  location: "Cebu City, Philippines",
};

// ─── MISSION & VISION ────────────────────────────────────────────────────────
export const MISSION_VISION = {
  mission: {
    title: "Our Mission",
    text: "To deliver professional photography that feels personal — preserving genuine moments through technical excellence, artistic vision, and a client experience built on trust.",
  },
  vision: {
    title: "Our Vision",
    text: "To become Cebu's most trusted photography studio — where every client, regardless of occasion or budget, receives photography they are proud to carry through life.",
  },
};

// ─── CORE VALUES ─────────────────────────────────────────────────────────────
export const CORE_VALUES = [
  {
    id: "authenticity",
    icon: "Heart",
    title: "Authenticity",
    description:
      "We capture real moments — not manufactured ones. Every image should feel genuinely you.",
  },
  {
    id: "excellence",
    icon: "Award",
    title: "Excellence",
    description:
      "From the first consultation to the final edited file — we hold every detail to a high standard.",
  },
  {
    id: "trust",
    icon: "Shield",
    title: "Trust",
    description:
      "Your memories are sacred. We handle every booking, every photo, and every client with complete care and professionalism.",
  },
  {
    id: "innovation",
    icon: "Sparkles",
    title: "Innovation",
    description:
      "We stay current with photography techniques, editing styles, and technology — including our online booking platform.",
  },
];

// ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────
// PLACEHOLDER — replace with real team photos and bios before launch
export const TEAM = [
  {
    id: "lead-photographer",
    name: "Marco dela Cruz",
    role: "Lead Photographer & Founder",
    bio: "Marco founded E-Kodak after years of freelance photography across Cebu. Specializing in portraits and events, his editorial eye and natural direction style define the studio's visual identity.",
    specializations: ["Portrait", "Events", "Commercial"],
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop&face",
    imageAlt: "Marco dela Cruz — Lead Photographer",
    initials: "MD",
    social: {
      instagram: "https://instagram.com/ekodak",
      facebook:  "https://facebook.com/ekodak",
    },
  },
  {
    id: "senior-photographer",
    name: "Sophia Reyes",
    role: "Senior Photographer",
    bio: "Sophia brings warmth and calm to every session she leads. Known for her ability to put nervous clients at ease, she specializes in family and graduation photography.",
    specializations: ["Family", "Graduation", "Couple"],
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&face",
    imageAlt: "Sophia Reyes — Senior Photographer",
    initials: "SR",
    social: {
      instagram: "https://instagram.com/ekodak",
    },
  },
  {
    id: "photographer",
    name: "James Villanueva",
    role: "Photographer",
    bio: "James discovered his passion for photography during his own graduation shoot. Now a full-time E-Kodak photographer, he covers events and brings creative energy to every assignment.",
    specializations: ["Events", "Graduation", "Portrait"],
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&auto=format&fit=crop&face",
    imageAlt: "James Villanueva — Photographer",
    initials: "JV",
    social: {
      instagram: "https://instagram.com/ekodak",
    },
  },
  {
    id: "photo-editor",
    name: "Carla Mendoza",
    role: "Lead Photo Editor",
    bio: "Carla's meticulous editing ensures every photo delivered by E-Kodak is polished to perfection. She develops and maintains our signature editing style across all sessions.",
    specializations: ["Retouching", "Color Grading", "Album Design"],
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop&face",
    imageAlt: "Carla Mendoza — Lead Photo Editor",
    initials: "CM",
    social: {
      instagram: "https://instagram.com/ekodak",
    },
  },
];

// ─── STUDIO TIMELINE ─────────────────────────────────────────────────────────
export const TIMELINE = [
  {
    year: "2021",
    title: "E-Kodak Founded",
    description:
      "Started as a one-photographer studio in Cebu, focusing on portrait and graduation photography.",
  },
  {
    year: "2022",
    title: "Team Expands",
    description:
      "Added two full-time photographers and a dedicated photo editor to handle growing client demand.",
  },
  {
    year: "2023",
    title: "500 Sessions Milestone",
    description:
      "Completed our 500th photography session — a milestone celebrated with our client community.",
  },
  {
    year: "2024",
    title: "Commercial Division Launched",
    description:
      "Expanded services to include commercial and branding photography for local businesses.",
  },
  {
    year: "2025",
    title: "Digital Platform Development",
    description:
      "Began development of the E-Kodak online booking and management platform for a seamless client experience.",
  },
  {
    year: "2026",
    title: "Full Platform Launch",
    description:
      "Launched the complete Photography Service Management System — online booking, real-time tracking, and mobile companion app.",
  },
];

// ─── AWARDS & RECOGNITION ─────────────────────────────────────────────────────
export const AWARDS = [
  {
    year: "2024",
    title: "Best Photography Studio",
    body: "Cebu Business Excellence Awards",
  },
  {
    year: "2023",
    title: "Top-Rated Photographer",
    body: "Google — 4.9★ from 200+ reviews",
  },
  {
    year: "2023",
    title: "Featured Studio",
    body: "Cebu Events Magazine",
  },
];

// ─── STUDIO NUMBERS (displayed on About page) ────────────────────────────────
export const STUDIO_STATS = [
  { value: "500+",  label: "Sessions Completed" },
  { value: "4.9★", label: "Average Rating" },
  { value: "4",    label: "Team Members" },
  { value: "5+",   label: "Years of Experience" },
];
