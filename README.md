# 📸 E-Kodak Photography Studio

> A modern, full-featured photography booking, studio management, and client showcase web application built with **React 19**, **Vite**, **Tailwind CSS**, and **Supabase**.

---

## 🌟 Features

- **Client Booking Portal**: Multi-step booking flow for graduation, portraits, events, and school packages with real-time price calculation and schedule validation.
- **QR Code Studio Check-in**: Secure digital booking pass tokens and QR scanner for instant studio front-desk check-in.
- **Photographer & Staff Portal**: Dedicated dashboard for photographers to claim assignments, view session schedules, upload photo outputs, and manage availability.
- **Admin Management Console**: Full administrative controls for services, pricing, booking calendar, team members, announcements, financial overview, and audit activity logs.
- **AI Studio Assistant**: Embedded Gemini-powered assistant to help clients explore packages, ask studio questions, and select services.
- **Role-Based Access Control**: Granular Row Level Security (RLS) in PostgreSQL protecting client profiles, bookings, photographer schedules, and administrative logs.
- **Automated Notifications**: Supabase Edge Functions with SMTP / email dispatch for booking confirmations, reminders, and status updates.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [React Router v7](https://reactrouter.com/)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), [Bootstrap Icons](https://icons.getbootstrap.com/), [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/), [GSAP](https://gsap.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Supabase Auth, Storage, Edge Functions)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini API)
- **Code Quality**: [Oxlint](https://oxc.rs/)

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x, 20.x, or later)
- [Git](https://git-scm.com/) installed on your machine
- A [Supabase](https://supabase.com/) project

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/e-kodak-final.git
cd e-kodak-final
npm install
```

### 3. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase project credentials:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# AI Assistant (Gemini API - optional)
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# Direct Database URL (Optional, for database maintenance scripts)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

> ⚠️ **Security Warning**: Never commit `.env` or your Supabase `service_role` key to Git. `.env` is ignored by default in `.gitignore`.

### 4. Running Locally

Start the local Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 📂 Project Structure

```text
├── docs/                 # Architectural documentation and ERD diagrams
├── public/               # Static assets, icons, and SVG illustrations
├── scripts/              # Database migration and utility scripts
├── src/
│   ├── components/       # Reusable UI components, navigation, modals, cards
│   ├── context/          # React context providers (Auth, Notifications, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Supabase client, QR token utilities, helper functions
│   ├── pages/            # Client, Photographer, and Admin application views
│   ├── services/         # API services for bookings, profiles, storage, etc.
│   ├── index.css         # Global styling and Tailwind directives
│   └── main.jsx          # React DOM entrypoint
├── supabase/
│   ├── functions/        # Supabase Edge Functions (e.g. send-email)
│   ├── migrations/       # SQL migration scripts for schema & RLS policies
│   └── schema.sql        # Master database schema
├── .env.example          # Template for required environment variables
├── .gitignore            # Git exclusion rules
├── package.json          # Project dependencies and npm scripts
└── vite.config.js        # Vite build tool configuration
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the local development server with Hot Module Replacement (HMR) |
| `npm run build` | Compiles and bundles production-ready assets into `dist/` |
| `npm run preview` | Locally previews the production build output |
| `npm run lint` | Runs Oxlint to inspect codebase quality and syntax rules |

---

## 🔒 Security Best Practices

1. **Keep Secrets in `.env`**: Always store API keys and database credentials in `.env`, which is untracked by Git.
2. **Row Level Security (RLS)**: Ensure all tables in Supabase have RLS enabled and verify policies against `docs/security-policy.md`.
3. **Database Password Rotation**: If any database connection strings were ever shared in testing, rotate the database password in the Supabase Dashboard under **Project Settings > Database**.

---

## 📄 License

Private repository — All rights reserved © E-Kodak Photography Studio.
